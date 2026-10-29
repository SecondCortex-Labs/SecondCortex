// The extension's only connection to `python -m secondcortex serve`. No vscode import: the outbox policy is
// tested under `node --test` against a stub HTTP server.
import { isSnapshot, redact, type Redacted, type Snapshot } from './snapshot';

/** `POST /ask` response. `sources[n - 1]` is the snapshot the answer cites as [n]. */
export interface Answer {
    readonly answer: string;
    readonly sources: readonly Snapshot[];
}

/** `message` is written for the user: the sidebar and the resurrect command show it as is. */
export type Result<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly message: string };

/** Where the outbox persists. `vscode.Memento` (workspaceState) satisfies it; tests pass a Map-backed fake. */
export interface Storage {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): PromiseLike<void>;
}

/**
 * What one `POST /snapshots` attempt means for the snapshot at the head of the outbox. A 422 means the
 * snapshot itself is invalid, so resending cannot help and it is dropped. Anything else (unreachable,
 * timeout, 5xx, other 4xx such as a wrong Host) is about the server or its address, so the snapshot is kept.
 */
type Delivery = 'delivered' | 'rejected' | 'retry';

/** Versioned so a future shape change starts a fresh queue instead of misreading the old one. */
const OUTBOX_KEY = 'secondcortex.outbox.v1';
const OUTBOX_CAP = 500;
const RETRY_MS = 30_000;
const SNAPSHOT_TIMEOUT_MS = 10_000;
const READ_TIMEOUT_MS = 10_000;
/** The backend's model client waits up to 120 s and retries once; past this the user has given up. */
const ASK_TIMEOUT_MS = 180_000;
const JSON_HEADERS = { 'content-type': 'application/json' };

export class LocalServer {
    /** Redacted snapshots not yet accepted by the server, oldest first. Persisted after every change. */
    private queue: readonly Redacted[];
    /** The one drain in progress, so concurrent flushes never send the same snapshot twice or out of order. */
    private flushing: Promise<void> | undefined;
    private retryTimer: ReturnType<typeof setTimeout> | undefined;
    private disposed = false;

    /**
     * Loads the queue synchronously, so a snapshot delivered right after activation lands behind the ones
     * a previous session left, never before them and never over them.
     */
    constructor(
        private readonly storage: Storage,
        private readonly baseUrl: () => string,
        private readonly log: (line: string) => void,
    ) {
        this.queue = storage.get<Redacted[]>(OUTBOX_KEY) ?? [];
    }

    /**
     * The only way a snapshot leaves the extension. Redacts it (the final outbound payload; nothing touches
     * it afterwards), appends it to the persisted queue, evicting the oldest past 500, and starts a flush.
     * Returns immediately. Delivery is at least once, which the server's upsert makes safe.
     */
    deliver(snapshot: Snapshot): void {
        this.queue = [...this.queue, redact(snapshot)].slice(-OUTBOX_CAP);
        void this.storage.update(OUTBOX_KEY, this.queue);
        void this.flush();
    }

    /** Sends queued snapshots in order until the queue is empty or the server is unavailable. Safe to call any time. */
    flush(): Promise<void> {
        return (this.flushing ??= this.drain());
    }

    /** `POST /ask`, scoped to one workspace when given. */
    ask(question: string, workspace: string | undefined): Promise<Result<Answer>> {
        return this.request(
            '/ask',
            { method: 'POST', body: JSON.stringify({ question, workspace }) },
            ASK_TIMEOUT_MS,
            (body) => {
                const { answer, sources } = (body ?? {}) as { answer?: unknown; sources?: unknown };
                return typeof answer === 'string' && Array.isArray(sources) && sources.every(isSnapshot)
                    ? { answer, sources }
                    : undefined;
            },
        );
    }

    /** `GET /snapshots?workspace=&limit=`, newest first. `limit` is 1 to 100. */
    recent(workspace: string, limit: number): Promise<Result<readonly Snapshot[]>> {
        const query = new URLSearchParams({ workspace, limit: String(limit) });
        return this.request(`/snapshots?${query}`, { method: 'GET' }, READ_TIMEOUT_MS, (body) =>
            Array.isArray(body) && body.every(isSnapshot) ? body : undefined,
        );
    }

    dispose(): void {
        this.disposed = true;
        clearTimeout(this.retryTimer);
    }

    private async drain(): Promise<void> {
        // Without this the drain could finish before flush() records it, leaving a finished promise in `flushing`.
        await null;
        try {
            clearTimeout(this.retryTimer);
            while (this.queue.length > 0 && !this.disposed) {
                const head = this.queue[0];
                const outcome = await this.post(head);
                if (outcome === 'retry') {
                    if (!this.disposed) {
                        this.log(`server unavailable, ${this.queue.length} queued, retrying in ${RETRY_MS / 1000} s`);
                        this.retryTimer = setTimeout(() => void this.flush(), RETRY_MS);
                    }
                    return;
                }
                // By identity, not position: deliver() may have evicted `head` at the cap while it was in flight,
                // and slice(1) would then drop a snapshot that was never sent.
                this.queue = this.queue.filter((s) => s !== head);
                void this.storage.update(OUTBOX_KEY, this.queue);
            }
        } finally {
            // Cleared in the same synchronous step as the emptiness check, so a deliver() can never see a
            // finished drain still registered and skip its own flush.
            this.flushing = undefined;
        }
    }

    private async post(snapshot: Redacted): Promise<Delivery> {
        try {
            const res = await fetch(this.url('/snapshots'), {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify(snapshot),
                signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS),
            });
            const text = await res.text();
            if (res.ok) {
                return 'delivered';
            }
            if (res.status === 422) {
                this.log(`dropped ${snapshot.file}, the server rejected it: ${detailOf(text)}`);
                return 'rejected';
            }
            this.log(`server answered ${res.status}: ${detailOf(text)}`);
            return 'retry';
        } catch {
            return 'retry';
        }
    }

    /**
     * Shared by `ask` and `recent`. Turns every failure into one user-facing sentence, so this file holds
     * the only copy of the start hint.
     */
    private async request<T>(
        path: string,
        init: RequestInit,
        timeoutMs: number,
        parse: (body: unknown) => T | undefined,
    ): Promise<Result<T>> {
        let res: Response;
        let text: string;
        try {
            res = await fetch(this.url(path), { ...init, headers: JSON_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
            text = await res.text();
        } catch (error) {
            const timedOut = error instanceof Error && error.name === 'TimeoutError';
            return {
                ok: false,
                message: timedOut
                    ? `SecondCortex did not answer within ${timeoutMs / 1000} s.`
                    : `SecondCortex is not running at ${this.baseUrl()}. Start it with: python -m secondcortex serve`,
            };
        }
        if (!res.ok) {
            return { ok: false, message: failure(res.status, text) };
        }
        const value = parse(parseJson(text));
        return value === undefined ? { ok: false, message: 'SecondCortex sent an unexpected response.' } : { ok: true, value };
    }

    /** Throws on a malformed `backendUrl`; callers treat that like an unreachable server. */
    private url(path: string): URL {
        return new URL(path, this.baseUrl());
    }
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

/** FastAPI's `detail` is a string for HTTPException and an array for validation errors. */
function detailOf(text: string): string {
    const detail = (parseJson(text) as { detail?: unknown } | undefined)?.detail;
    return (typeof detail === 'string' ? detail : JSON.stringify(detail ?? text)).slice(0, 300);
}

function failure(status: number, text: string): string {
    if (status === 502) {
        return `The model behind SecondCortex is not answering: ${detailOf(text)}`;
    }
    // Starlette's TrustedHostMiddleware answers with plain text, not JSON.
    if (status === 400 && text.includes('Invalid host header')) {
        return 'SecondCortex refused the address. Set secondcortex.backendUrl to use 127.0.0.1 or localhost.';
    }
    return `SecondCortex answered ${status}: ${detailOf(text)}`;
}
