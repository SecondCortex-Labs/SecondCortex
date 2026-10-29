// The outbox and HTTP policy, driven through LocalServer's public methods against a real HTTP stub.
import * as assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, test } from 'node:test';
import { LocalServer, type Storage } from '../../src/server';
import type { Snapshot } from '../../src/snapshot';

/** Persists by JSON round trip, like workspaceState, so tests see what a restart would see. */
function memoryStorage(): Storage & { raw(): string; queue(): Snapshot[] } {
    const values = new Map<string, string>();
    return {
        get: <T>(key: string) => (values.has(key) ? (JSON.parse(values.get(key)!) as T) : undefined),
        update: (key: string, value: unknown) => {
            values.set(key, JSON.stringify(value));
            return Promise.resolve();
        },
        raw: () => [...values.values()].join('\n'),
        queue: () => JSON.parse(values.get('secondcortex.outbox.v1') ?? '[]') as Snapshot[],
    };
}

interface Received {
    readonly method: string;
    readonly url: string;
    readonly body: unknown;
}

interface Stub {
    readonly url: string;
    readonly received: Received[];
}

interface Reply {
    readonly status: number;
    readonly body?: unknown;
    /** Sent as is, for the plain-text answers Starlette's host check gives. */
    readonly raw?: string;
}

const stubs: Array<() => Promise<void>> = [];
const servers: LocalServer[] = [];

afterEach(async () => {
    servers.splice(0).forEach((server) => server.dispose());
    await Promise.all(stubs.splice(0).map((close) => close()));
});

/** A local HTTP server answering each request with `respond`; records every request in order. */
async function stub(respond: (req: IncomingMessage, body: unknown) => Reply | Promise<Reply>): Promise<Stub> {
    const received: Received[] = [];
    const server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
            const text = Buffer.concat(chunks).toString();
            const body: unknown = text ? JSON.parse(text) : undefined;
            received.push({ method: req.method!, url: req.url!, body });
            const reply = await respond(req, body);
            res.writeHead(reply.status, { 'content-type': reply.raw === undefined ? 'application/json' : 'text/plain' });
            res.end(reply.raw ?? JSON.stringify(reply.body ?? {}));
        });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    stubs.push(() => {
        server.closeAllConnections();
        return new Promise((resolve) => server.close(() => resolve()));
    });
    return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, received };
}

/** An address nothing listens on: connections are refused. */
async function unreachable(): Promise<string> {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const { port } = probe.address() as AddressInfo;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    return `http://127.0.0.1:${port}`;
}

function open(storage: Storage, url: string, log: (line: string) => void = () => {}): LocalServer {
    const server = new LocalServer(storage, () => url, log);
    servers.push(server);
    return server;
}

const snap = (excerpt: string): Snapshot => ({
    workspace: 'file:///c%3A/work/app',
    file: 'src/app.ts',
    branch: 'main',
    timestamp: '2026-10-29T10:00:00.000Z',
    language: 'typescript',
    symbol: null,
    signatures: [],
    commands: [],
    excerpt,
});

async function until(done: () => boolean, ms = 3000): Promise<void> {
    const deadline = Date.now() + ms;
    while (!done()) {
        assert.ok(Date.now() < deadline, 'timed out waiting for the server to receive the snapshot');
        await new Promise((resolve) => setTimeout(resolve, 5));
    }
}

const excerpts = (received: Received[]) => received.map((r) => (r.body as Snapshot).excerpt);

test('delivers snapshots to POST /snapshots in capture order', async () => {
    const server = await stub(() => ({ status: 200, body: { id: 'x' } }));
    const storage = memoryStorage();
    const local = open(storage, server.url);
    for (const excerpt of ['a', 'b', 'c']) {
        local.deliver(snap(excerpt));
    }
    await local.flush();
    assert.deepEqual(excerpts(server.received), ['a', 'b', 'c']);
    assert.deepEqual(server.received.map((r) => `${r.method} ${r.url}`), Array(3).fill('POST /snapshots'));
    assert.deepEqual(storage.queue(), []);
});

test('keeps snapshots through 5xx and replays them in order once the server recovers', async () => {
    let status = 503;
    const server = await stub(() => ({ status }));
    const storage = memoryStorage();
    const lines: string[] = [];
    const local = open(storage, server.url, (line) => lines.push(line));
    local.deliver(snap('a'));
    local.deliver(snap('b'));
    await local.flush();
    assert.deepEqual(storage.queue().map((s) => s.excerpt), ['a', 'b']);
    assert.ok(lines.some((line) => line.includes('retrying in 30 s')), 'the retry is announced');

    status = 200;
    server.received.length = 0;
    await local.flush();
    assert.deepEqual(excerpts(server.received), ['a', 'b']);
    assert.deepEqual(storage.queue(), []);
});

test('keeps snapshots while the server is unreachable', async () => {
    const storage = memoryStorage();
    const local = open(storage, await unreachable());
    local.deliver(snap('a'));
    await local.flush();
    assert.deepEqual(storage.queue().map((s) => s.excerpt), ['a']);
});

test('drops a snapshot the server rejects with 422 and sends the next one', async () => {
    const server = await stub((_req, body) =>
        (body as Snapshot).excerpt === 'bad' ? { status: 422, body: { detail: 'file must not be empty' } } : { status: 200 },
    );
    const storage = memoryStorage();
    const lines: string[] = [];
    const local = open(storage, server.url, (line) => lines.push(line));
    local.deliver(snap('bad'));
    local.deliver(snap('good'));
    await local.flush();
    assert.deepEqual(excerpts(server.received), ['bad', 'good']);
    assert.deepEqual(storage.queue(), []);
    assert.ok(lines.some((line) => line.includes('file must not be empty')), 'the rejection reason is logged');
});

test('replays the queue a previous session left behind', async () => {
    const storage = memoryStorage();
    const first = open(storage, await unreachable());
    first.deliver(snap('a'));
    first.deliver(snap('b'));
    await first.flush();
    first.dispose();

    const server = await stub(() => ({ status: 200 }));
    const second = open(storage, server.url);
    await second.flush();
    assert.deepEqual(excerpts(server.received), ['a', 'b']);
});

test('a snapshot delivered right after activation lands behind the ones a previous session left', async () => {
    const storage = memoryStorage();
    const first = open(storage, await unreachable());
    first.deliver(snap('old'));
    await first.flush();
    first.dispose();

    const server = await stub(() => ({ status: 200 }));
    const second = open(storage, server.url);
    second.deliver(snap('new'));
    await second.flush();
    assert.deepEqual(excerpts(server.received), ['old', 'new']);
});

test('caps the queue at 500 snapshots and evicts the oldest', async () => {
    const storage = memoryStorage();
    const local = open(storage, await unreachable());
    for (let i = 0; i <= 500; i++) {
        local.deliver(snap(String(i)));
    }
    await local.flush();
    const queued = storage.queue().map((s) => s.excerpt);
    assert.equal(queued.length, 500);
    assert.equal(queued[0], '1');
    assert.equal(queued[499], '500');
});

test('a snapshot evicted at the cap while in flight does not take an unsent one with it', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let first = true;
    const server = await stub(async () => {
        if (first) {
            first = false;
            await gate;
        }
        return { status: 200 };
    });
    const storage = memoryStorage();
    const local = open(storage, server.url);
    local.deliver(snap('0'));
    await until(() => server.received.length === 1);
    for (let i = 1; i <= 500; i++) {
        local.deliver(snap(String(i)));
    }
    release();
    await local.flush();
    assert.deepEqual(excerpts(server.received), Array.from({ length: 501 }, (_, i) => String(i)));
    assert.deepEqual(storage.queue(), []);
});

test('a snapshot delivered in the same tick the last drain finishes is still sent', async () => {
    const server = await stub(() => ({ status: 200 }));
    const storage = memoryStorage();
    let local: LocalServer;
    let injected = false;
    // The drain's last act is persisting the empty queue; a capture resolving in that tick calls deliver().
    const racing: Storage = {
        get: storage.get,
        update: (key, value) => {
            if (Array.isArray(value) && value.length === 0 && !injected) {
                injected = true;
                queueMicrotask(() => local.deliver(snap('b')));
            }
            return storage.update(key, value);
        },
    };
    local = open(racing, server.url);
    local.deliver(snap('a'));
    await until(() => server.received.length === 2);
    assert.deepEqual(excerpts(server.received), ['a', 'b']);
});

test('never persists or sends an unredacted secret', async () => {
    const storage = memoryStorage();
    const local = open(storage, await unreachable());
    local.deliver(snap('password = "hunter2"'));
    await local.flush();
    assert.ok(!storage.raw().includes('hunter2'), 'the persisted queue is redacted');
    assert.ok(storage.raw().includes('[REDACTED]'));

    const server = await stub(() => ({ status: 200 }));
    const later = open(storage, server.url);
    await later.flush();
    assert.equal(server.received.length, 1);
    assert.ok(!JSON.stringify(server.received[0].body).includes('hunter2'), 'the request body is redacted');
});

test('ask returns the answer and its sources in citation order', async () => {
    const s1 = { ...snap('one'), file: 'src/one.ts' };
    const s2 = { ...snap('two'), file: 'src/two.ts' };
    const server = await stub(() => ({ status: 200, body: { answer: 'see [1] and [2]', sources: [s1, s2] } }));
    const result = await open(memoryStorage(), server.url).ask('what changed?', 'file:///c%3A/work/app');
    assert.ok(result.ok);
    assert.equal(result.value.answer, 'see [1] and [2]');
    assert.deepEqual(result.value.sources.map((s) => s.file), ['src/one.ts', 'src/two.ts']);
    assert.deepEqual(server.received[0].body, { question: 'what changed?', workspace: 'file:///c%3A/work/app' });
    assert.equal(server.received[0].url, '/ask');
});

test('ask says how to start the server when it is unreachable', async () => {
    const result = await open(memoryStorage(), await unreachable()).ask('anything', undefined);
    assert.ok(!result.ok);
    assert.ok(result.message.includes('python -m secondcortex serve'), result.message);
});

test('ask passes on the model endpoint failure on 502', async () => {
    const server = await stub(() => ({ status: 502, body: { detail: 'model down' } }));
    const result = await open(memoryStorage(), server.url).ask('anything', undefined);
    assert.ok(!result.ok);
    assert.ok(result.message.includes('model down'), result.message);
});

test('ask tells the user to fix backendUrl when the server refuses the Host header', async () => {
    const server = await stub(() => ({ status: 400, raw: 'Invalid host header' }));
    const result = await open(memoryStorage(), server.url).ask('anything', undefined);
    assert.ok(!result.ok);
    assert.ok(result.message.includes('secondcortex.backendUrl'), result.message);
});

test('ask rejects an answer that is not an answer', async () => {
    const server = await stub(() => ({ status: 200, body: { answer: 5 } }));
    const result = await open(memoryStorage(), server.url).ask('anything', undefined);
    assert.ok(!result.ok);
    const plain = await stub(() => ({ status: 200, raw: 'hello' }));
    assert.ok(!(await open(memoryStorage(), plain.url).ask('anything', undefined)).ok);
});

test('a malformed backendUrl reads as an unreachable server', async () => {
    const result = await open(memoryStorage(), 'not a url').ask('anything', undefined);
    assert.ok(!result.ok);
    assert.ok(result.message.includes('python -m secondcortex serve'), result.message);
});

test('recent asks for one workspace and a limit and returns snapshots newest first', async () => {
    const s2 = { ...snap('two'), timestamp: '2026-10-29T11:00:00.000Z' };
    const s1 = snap('one');
    const server = await stub(() => ({ status: 200, body: [s2, s1] }));
    const result = await open(memoryStorage(), server.url).recent('file:///c%3A/work/app', 30);
    assert.ok(result.ok);
    assert.deepEqual(result.value.map((s) => s.excerpt), ['two', 'one']);
    const query = new URL(server.received[0].url, 'http://x');
    assert.equal(query.pathname, '/snapshots');
    assert.equal(query.searchParams.get('workspace'), 'file:///c%3A/work/app');
    assert.equal(query.searchParams.get('limit'), '30');
});
