import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSnapshot, redact, type Snapshot } from '../../src/snapshot';

// Fake secrets are assembled at runtime so no literal in this file trips a secret scanner on push.
const x = (n: number) => 'X'.repeat(n);
const STRIPE = 'sk_' + 'live_' + x(24);
const AWS = 'AKIA' + 'Q'.repeat(16);
const GITHUB = 'ghp' + '_' + x(36);
const OPENAI = 'sk-' + 'proj-' + x(40);
const JWT = ['eyJ' + x(12), 'eyJ' + x(12), x(16)].join('.');
const PEM_BODY = ['MII' + x(61), x(64), x(20) + '=='].join('\n');
const PEM = `-----BEGIN RSA PRIVATE KEY-----\n${PEM_BODY}\n-----END RSA PRIVATE KEY-----`;

const sample = (over: Partial<Snapshot>): Snapshot => ({
    workspace: 'file:///c%3A/work/app',
    file: 'src/app.ts',
    branch: 'main',
    timestamp: '2026-10-29T10:00:00.000Z',
    language: 'typescript',
    symbol: null,
    signatures: [],
    commands: [],
    excerpt: '',
    ...over,
});

const facts = (text: string, cursorLine: number) => ({
    workspace: 'file:///w',
    file: 'a.ts',
    branch: null,
    language: 'typescript',
    text,
    cursorLine,
    symbols: [],
    commands: [],
    at: new Date(),
});

const scrubbed = (excerpt: string) => redact(sample({ excerpt })).excerpt;

type Case = readonly [string, string, string];

const OLD_REGEX_CASES: readonly Case[] = [
    ['Stripe key', `charge(${JSON.stringify(STRIPE)})`, STRIPE],
    ['bearer token', `headers.Authorization = 'Bearer ${x(30)}'`, x(30)],
    ['AWS access key', `aws configure set id ${AWS}`, AWS],
    ['Azure connection string', `AccountKey=${x(40)};EndpointSuffix=core.windows.net`, x(40)],
    ['private key block', PEM, x(64)],
    ['JWT', `const t = verify("${JWT}")`, JWT],
    ['.env line', `DATABASE_URL=${x(30)}`, x(30)],
    ['indented .env line', `    DATABASE_URL=${x(30)}`, x(30)],
    ['GitHub token', `git clone https://${GITHUB}@github.com/a/b`, GITHUB],
    ['OpenAI key', `OpenAI(api=${OPENAI})`, OPENAI],
];

const OLD_AST_CASES: readonly Case[] = [
    ['const declaration', 'const stripeKey = "abc123secret";', 'abc123secret'],
    ['let with single quotes', "let myCustomToken = 'xyz123';", 'xyz123'],
    ['type-annotated declaration', 'const apiSecret: string = "s3cr3t-value";', 's3cr3t-value'],
    ['object property', '{ authToken: "s3cr3t" }', 's3cr3t'],
    ['quoted property', "{ 'client_secret': 'p@ss' }", 'p@ss'],
    ['template literal', 'const dbPassword = `hunter2`;', 'hunter2'],
    ['nested property', 'this.config = { credentials: { apiKey: "k-123" } };', 'k-123'],
];

const OTHER_LANGUAGE_CASES: readonly Case[] = [
    ['Python assignment', 'password = "hunter2"', 'hunter2'],
    ['Python default argument', 'def connect(url, password="hunter2"):', 'hunter2'],
    ['TypeScript default argument', 'function connect(url: string, password = "hunter2") {', 'hunter2'],
    ['JSON', '"api_key": "abc-123-def"', 'abc-123-def'],
    ['YAML', 'api_key: abc123def', 'abc123def'],
    ['Go short declaration', 'token := "tok-9876"', 'tok-9876'],
    ['shell export', 'export DB_PASSWORD=hunter22', 'hunter22'],
    ['PHP array', "'secret' => 'shh-1234'", 'shh-1234'],
    ['TOML', 'auth_token = "t-5555"', 't-5555'],
];

const ORDINARY_CODE = [
    'const tokenizer = new Tokenizer();',
    'if (password.length < 8) {',
    'auth: true',
    'key: null',
    "import { readFile } from 'fs';",
    'const url = "https://example.com/path";',
    'if (token == "abc") {',
];

function assertRedacted(cases: readonly Case[]): void {
    for (const [name, input, secret] of cases) {
        const output = scrubbed(input);
        assert.ok(!output.includes(secret), `${name}: secret survived in ${JSON.stringify(output)}`);
        assert.ok(output.includes('[REDACTED]'), `${name}: nothing was redacted in ${JSON.stringify(output)}`);
    }
}

test('redacts every secret format the old firewall regexes caught', () => {
    assertRedacted(OLD_REGEX_CASES);
});

test('still catches every case the old TypeScript AST scrub caught, keeping the name and the code around it', () => {
    assertRedacted(OLD_AST_CASES);
    assert.equal(scrubbed('const stripeKey = "abc123secret";'), 'const stripeKey = "[REDACTED]";');
    assert.equal(scrubbed('{ authToken: "s3cr3t" }'), '{ authToken: "[REDACTED]" }');
});

test('catches a secret assigned to a secret-like name in any language', () => {
    assertRedacted(OTHER_LANGUAGE_CASES);
});

test('redacts every string field and array item, not just the excerpt', () => {
    const secret = x(30);
    const snapshot = sample({
        file: `src/${STRIPE}.ts`,
        branch: `fix/${GITHUB}`,
        symbol: `connect_${OPENAI}`,
        signatures: ['function connect(url: string, password = "hunter2") {'],
        commands: [`curl -H "Authorization: Bearer ${secret}" http://x`, `export API_TOKEN=${secret}`],
        excerpt: 'password = "hunter2"',
    });
    const sent = JSON.stringify(redact(snapshot));
    for (const leaked of [STRIPE, GITHUB, OPENAI, 'hunter2', secret]) {
        assert.ok(!sent.includes(leaked), `${leaked} survived in ${sent}`);
    }
});

test('signature lines built from raw text are redacted before they leave', () => {
    const text = 'export function connect(url: string, password = "hunter2") {\n    return url;\n}\n';
    const built = buildSnapshot({
        ...facts(text, 1),
        symbols: [{ name: 'connect', line: 0, start: 0, end: 2, children: [] }],
    });
    assert.equal(redact(built).signatures[0], 'export function connect(url: string, password = "[REDACTED]") {');
});

test('a private key cut by the excerpt window is still redacted', () => {
    const tailCut = `-----BEGIN PRIVATE KEY-----\n${['MII' + x(61), x(64)].join('\n')}`;
    const headCut = `const a = 1;\n${x(64)}\n${x(64)}\n-----END PRIVATE KEY-----`;
    assertRedacted([
        ['private key without END', tailCut, x(64)],
        ['private key without BEGIN', headCut, x(64)],
    ]);
});

test('a secret on the line at the edge of the excerpt window is redacted whole', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `const filler${i} = ${i};`);
    lines[100] = `const apiKey = "${x(40)}";`;
    const text = lines.join('\n');
    for (let cursor = 0; cursor < lines.length; cursor += 7) {
        const { excerpt } = redact(buildSnapshot(facts(text, cursor)));
        assert.ok(!excerpt.includes('XXXX'), `cursor ${cursor}: part of the value survived in the excerpt`);
    }
});

test('leaves ordinary code alone', () => {
    for (const line of ORDINARY_CODE) {
        assert.equal(scrubbed(line), line);
    }
});

test('is idempotent', () => {
    const everything = [...OLD_REGEX_CASES, ...OLD_AST_CASES, ...OTHER_LANGUAGE_CASES].map(([, input]) => input);
    const snapshot = sample({
        excerpt: everything.join('\n'),
        signatures: ['function connect(url: string, password = "hunter2") {'],
        commands: [`curl -H "Authorization: Bearer ${x(30)}"`],
    });
    const once = redact(snapshot);
    assert.deepEqual(redact(once), once);
    assert.equal(once.workspace, snapshot.workspace);
    assert.equal(once.timestamp, snapshot.timestamp);
});

test('scans pathological runs in well under 100 ms', () => {
    const runs: Record<string, string> = {
        'repeated dotted name': 'ab.key'.repeat(334),
        'repeated keyword': 'key'.repeat(667),
        'minified accessors': 'a.key=b.token&&c.auth(d);'.repeat(80),
        'name without operator': 'apiKey '.repeat(285),
        'name then spaces': 'apiKey:' + ' '.repeat(2000),
        'tabs after name': 'apiKey =' + '\t'.repeat(2000),
    };
    for (const [label, text] of Object.entries(runs)) {
        const started = performance.now();
        scrubbed(text.slice(0, 2000));
        const elapsed = performance.now() - started;
        assert.ok(elapsed < 100, `${label} took ${elapsed} ms`);
    }
});

test('redacts 20,000 newlines and 50,000 identical characters each in under 50 ms', () => {
    for (const [label, text] of [['newlines', '\n'.repeat(20_000)], ['letters', 'a'.repeat(50_000)]] as const) {
        const started = performance.now();
        scrubbed(text);
        const elapsed = performance.now() - started;
        assert.ok(elapsed < 50, `${label} took ${elapsed} ms`);
    }
});
