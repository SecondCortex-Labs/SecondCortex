import { minimatch } from 'minimatch';

/**
 * One moment of work, exactly as `POST /snapshots` accepts it (secondcortex-local/secondcortex/memory.py
 * `Snapshot`). The backend rejects unknown fields with a 422, so this interface and that model must list the
 * same fields. Responses add a computed `id`, which the extension never sends.
 */
export interface Snapshot {
    /** `WorkspaceFolder.uri.toString()`, so two checkouts with the same folder name never collide. */
    readonly workspace: string;
    /** Relative to the workspace folder, '/' separators, never empty. */
    readonly file: string;
    readonly branch: string | null;
    /** ISO 8601 with offset; `Date.toISOString()` gives 'Z'. */
    readonly timestamp: string;
    readonly language: string;
    readonly symbol: string | null;
    readonly signatures: readonly string[];
    readonly commands: readonly string[];
    readonly excerpt: string;
}

declare const redactedBrand: unique symbol;

export type Redacted = Snapshot & { readonly [redactedBrand]: true };

export interface CodeSymbol {
    readonly name: string;
    /** Line of the declaration (`selectionRange`), so decorators and doc comments above it are skipped. */
    readonly line: number;
    readonly start: number;
    readonly end: number;
    readonly children: readonly CodeSymbol[];
}

export interface EditorFacts {
    readonly workspace: string;
    readonly file: string;
    readonly branch: string | null;
    readonly language: string;
    readonly text: string;
    readonly cursorLine: number;
    readonly symbols: readonly CodeSymbol[];
    readonly commands: readonly string[];
    readonly at: Date;
}

const EXCERPT_CHARS = 2000;
const MAX_SIGNATURES = 20;
const MAX_SIGNATURE_CHARS = 200;
const MAX_COMMAND_CHARS = 500;

export function buildSnapshot(facts: EditorFacts): Snapshot {
    const lines = facts.text.split(/\r?\n/);
    const cursor = Math.min(Math.max(facts.cursorLine, 0), lines.length - 1);
    return {
        workspace: facts.workspace,
        file: facts.file,
        branch: facts.branch,
        timestamp: facts.at.toISOString(),
        language: facts.language,
        symbol: innermost(facts.symbols, cursor)?.name ?? null,
        signatures: preorder(facts.symbols)
            // The text can be newer than the symbols when the user kept typing during the provider call.
            .map((s) => lines[s.line]?.trim().slice(0, MAX_SIGNATURE_CHARS) ?? '')
            .filter(Boolean)
            .slice(0, MAX_SIGNATURES),
        commands: facts.commands.map((command) => command.slice(0, MAX_COMMAND_CHARS)),
        excerpt: excerptAround(lines, cursor),
    };
}

function innermost(symbols: readonly CodeSymbol[], line: number): CodeSymbol | undefined {
    const hit = symbols.find((s) => s.start <= line && line <= s.end);
    return hit && (innermost(hit.children, line) ?? hit);
}

function preorder(symbols: readonly CodeSymbol[]): CodeSymbol[] {
    return symbols.flatMap((s) => [s, ...preorder(s.children)]);
}

/**
 * Whole lines only, so a one-line `name = "secret"` is either inside the excerpt or outside it and redaction
 * sees it complete. A single line longer than the limit (minified code) is cut around its middle instead.
 */
function excerptAround(lines: readonly string[], cursor: number): string {
    const line = lines[cursor];
    if (line.length > EXCERPT_CHARS) {
        // Cutting the line could split a quoted secret, and redaction only matches complete values.
        return '';
    }
    let from = cursor;
    let to = cursor;
    let size = line.length;
    for (let above = true; from > 0 || to < lines.length - 1; above = !above) {
        const next = above ? from - 1 : to + 1;
        if (next < 0 || next >= lines.length) {
            continue;
        }
        size += 1 + lines[next].length;
        if (size > EXCERPT_CHARS) {
            break;
        }
        if (above) {
            from = next;
        } else {
            to = next;
        }
    }
    return lines.slice(from, to + 1).join('\n');
}

const REDACTED = '[REDACTED]';

/** The last catches a private-key body whose BEGIN line fell outside the excerpt. */
const SECRET_PATTERNS: readonly RegExp[] = [
    // The END line is optional because the excerpt window may cut it off.
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
    /(?:sk_live_|sk_test_|pk_live_|pk_test_)[A-Za-z0-9]{10,}/g,
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
    /AKIA[0-9A-Z]{16}/g,
    /(?:AccountKey|SharedAccessKey)\s*=\s*[A-Za-z0-9+/=]{20,}/gi,
    /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    // Leading whitespace is [ \t], not \s: `\s*` after every newline of a newline run is quadratic.
    /^[ \t]*[A-Z_]{2,50}=["']?[A-Za-z0-9\-._~+/]{20,}["']?/gm,
    /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    /sk-[A-Za-z0-9_-]{32,}/g,
    /^[A-Za-z0-9+/]{60,}={0,2}$/gm,
];

/**
 * The lookbehind starts a match only at the beginning of an identifier chain, and the lookahead checks for
 * the keyword once so the chain is then consumed without backtracking over each keyword in it. The old form
 * took 407 ms on a 2,000-character run of `ab.key` and 1.1 s on 50,000 characters of `key-`; this one takes
 * about 1 ms.
 */
const SECRET_NAME = String.raw`(?<![\w.$-])(?=[\w.$-]*(?:key|token|secret|password|passwd|credential|auth))[\w.$-]+`;

/**
 * The type annotation takes its spaces from its own character class: a `\s*` beside it made `apiKey:` plus
 * 2,000 spaces take 1.4 s.
 */
const QUOTED_ASSIGNMENT = new RegExp(
    String.raw`(${SECRET_NAME}["']?\s*(?::[\w.<>\[\]|? ]+?)?(?:=>|:=|=|:)\s*)(["'\x60])((?:\\.|(?!\2)[^\\\n])*)\2`,
    'gi',
);

/** Only [ \t] between tokens, for the same reason as the .env pattern above. */
const BARE_ASSIGNMENT = new RegExp(
    String.raw`^([ \t]*(?:export[ \t]+|set[ \t]+)?${SECRET_NAME}[ \t]*[=:][ \t]*)(?!(?:true|false|null|none|yes|no)[ \t]*$)([^\s'"\x60#]{4,})[ \t]*$`,
    'gim',
);

export function redact(snapshot: Snapshot): Redacted {
    return Object.fromEntries(
        Object.entries(snapshot).map(([key, value]) => [
            key,
            typeof value === 'string' ? scrub(value) : Array.isArray(value) ? value.map(scrub) : value,
        ]),
    ) as Redacted;
}

function scrub(text: string): string {
    for (const pattern of SECRET_PATTERNS) {
        text = text.replace(pattern, REDACTED);
    }
    return text
        .replace(QUOTED_ASSIGNMENT, (_match, head: string, quote: string) => head + quote + REDACTED + quote)
        .replace(BARE_ASSIGNMENT, (_match, head: string) => head + REDACTED);
}

const ALWAYS_IGNORED = ['.env', '.env.*', 'secrets/'];

export function isIgnored(file: string, cortexignore: string): boolean {
    const lines = cortexignore
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && !line.startsWith('!'));
    return [...ALWAYS_IGNORED, ...lines].some((pattern) => {
        const body = pattern.replace(/^\//, '').replace(/\/$/, '');
        const glob = pattern.endsWith('/') ? `${body}/**` : body;
        const floating = !pattern.startsWith('/') && !body.includes('/');
        // gitignore has no brace syntax, and a cloned repository can bring its own .cortexignore. Brace
        // expansion of a hostile pattern is a known denial of service in brace-expansion.
        return minimatch(file, floating ? `**/${glob}` : glob, { dot: true, nobrace: true });
    });
}

export function isSnapshot(value: unknown): value is Snapshot {
    const v = value as Record<string, unknown> | null;
    const isStrings = (x: unknown) => Array.isArray(x) && x.every((item) => typeof item === 'string');
    const isNullableString = (x: unknown) => x === null || typeof x === 'string';
    return (
        typeof v === 'object' &&
        v !== null &&
        ['workspace', 'file', 'timestamp', 'language', 'excerpt'].every((key) => typeof v[key] === 'string') &&
        isNullableString(v.branch) &&
        isNullableString(v.symbol) &&
        isStrings(v.signatures) &&
        isStrings(v.commands)
    );
}
