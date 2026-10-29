import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSnapshot, isIgnored, isSnapshot, type CodeSymbol, type EditorFacts } from '../../src/snapshot';

const facts = (over: Partial<EditorFacts>): EditorFacts => ({
    workspace: 'file:///c%3A/work/app',
    file: 'src/app.ts',
    branch: 'main',
    language: 'typescript',
    text: '',
    cursorLine: 0,
    symbols: [],
    commands: [],
    at: new Date('2026-10-29T10:00:00.000Z'),
    ...over,
});

const sym = (name: string, line: number, end: number, children: CodeSymbol[] = [], start = line): CodeSymbol => ({
    name,
    line,
    start,
    end,
    children,
});

const numbered = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join('\n');

test('symbol is the innermost function, method, or class containing the cursor', () => {
    const store = sym('Store', 0, 20, [sym('put', 2, 10, [sym('key', 4, 6)])]);
    const text = numbered(21);
    assert.equal(buildSnapshot(facts({ text, symbols: [store], cursorLine: 5 })).symbol, 'key');
    assert.equal(buildSnapshot(facts({ text, symbols: [store], cursorLine: 8 })).symbol, 'put');
    assert.equal(buildSnapshot(facts({ text, symbols: [store], cursorLine: 15 })).symbol, 'Store');
});

test('symbol is null when the cursor is outside every symbol', () => {
    const text = `import x from 'x';\n\n${numbered(10)}`;
    assert.equal(buildSnapshot(facts({ text, symbols: [sym('Store', 2, 11)], cursorLine: 0 })).symbol, null);
});

test('signatures are the declaration lines in document order, trimmed, at most 20', () => {
    const lines: string[] = [];
    const symbols: CodeSymbol[] = [];
    for (let i = 0; i < 25; i++) {
        const decorated = i === 3;
        if (decorated) {
            lines.push('@cached');
        }
        lines.push(`    def f${i}(self):`);
        const declaration = lines.length - 1;
        lines.push('        pass');
        symbols.push(sym(`f${i}`, declaration, lines.length - 1, [], decorated ? declaration - 1 : declaration));
    }
    const { signatures } = buildSnapshot(facts({ text: lines.join('\n'), symbols }));
    assert.equal(signatures.length, 20);
    assert.deepEqual(signatures.slice(0, 5), ['def f0(self):', 'def f1(self):', 'def f2(self):', 'def f3(self):', 'def f4(self):']);
});

test('a symbol line the text no longer has is left out instead of failing the snapshot', () => {
    const { signatures } = buildSnapshot(facts({ text: 'function a() {}', symbols: [sym('a', 0, 0), sym('gone', 40, 50)] }));
    assert.deepEqual(signatures, ['function a() {}']);
});

test('excerpt is whole lines around the cursor, within 2,000 characters', () => {
    const text = Array.from({ length: 500 }, (_, i) => `${String(i).padStart(3, '0')} ${'x'.repeat(36)}`).join('\n');
    const { excerpt } = buildSnapshot(facts({ text, cursorLine: 250 }));
    const lines = excerpt.split('\n');
    assert.ok(excerpt.length <= 2000);
    assert.ok(excerpt.length > 1900, 'the window should use most of its budget');
    assert.ok(lines.includes(`250 ${'x'.repeat(36)}`));
    assert.ok(lines.every((line) => line.length === 40), 'every line is whole');
    assert.ok(Math.abs(250 - Number(lines[0].slice(0, 3)) - (Number(lines.at(-1)!.slice(0, 3)) - 250)) <= 1, 'balanced around the cursor');
});

test('excerpt at the start of a file keeps growing downward', () => {
    const { excerpt } = buildSnapshot(facts({ text: numbered(1000), cursorLine: 0 }));
    assert.ok(excerpt.startsWith('line 0\nline 1\n'));
    assert.ok(excerpt.length > 1900 && excerpt.length <= 2000);
});

test('excerpt of one very long line is a slice around the cursor, not empty', () => {
    const { excerpt } = buildSnapshot(facts({ text: 'a'.repeat(50_000) }));
    assert.ok(excerpt.length > 0 && excerpt.length <= 2000);
});

test('copies workspace, file, branch, and language and stamps an ISO 8601 timestamp with offset', () => {
    const snapshot = buildSnapshot(facts({ branch: null }));
    assert.equal(snapshot.workspace, 'file:///c%3A/work/app');
    assert.equal(snapshot.file, 'src/app.ts');
    assert.equal(snapshot.branch, null);
    assert.equal(snapshot.language, 'typescript');
    assert.equal(snapshot.timestamp, '2026-10-29T10:00:00.000Z');
});

test('commands are copied and each is cut at 500 characters', () => {
    const { commands } = buildSnapshot(facts({ commands: ['npm test', 'x'.repeat(5000)] }));
    assert.deepEqual(commands.map((c) => c.length), [8, 500]);
});

test('always ignores .env files and anything under a secrets/ directory', () => {
    for (const file of ['.env', 'api/.env.local', 'config/secrets/prod.json', 'secrets/a']) {
        assert.equal(isIgnored(file, ''), true, file);
    }
    assert.equal(isIgnored('src/env.ts', ''), false);
});

test('.cortexignore patterns without a slash match at any depth', () => {
    assert.equal(isIgnored('certs/dev.pem', '*.pem'), true);
    assert.equal(isIgnored('dev.pem', '*.pem'), true);
});

test('a trailing slash ignores everything under that directory', () => {
    assert.equal(isIgnored('build/out.js', 'build/'), true);
    assert.equal(isIgnored('pkg/build/out.js', 'build/'), true);
    assert.equal(isIgnored('builder.ts', 'build/'), false);
});

test('a leading slash anchors the pattern to the workspace root', () => {
    assert.equal(isIgnored('notes.md', '/notes.md'), true);
    assert.equal(isIgnored('docs/notes.md', '/notes.md'), false);
});

test('a pattern with a slash in the middle is relative to the workspace root', () => {
    assert.equal(isIgnored('src/gen/x.ts', 'src/gen/'), true);
    assert.equal(isIgnored('lib/src/gen/x.ts', 'src/gen/'), false);
});

test('comments, blank lines, and negations are skipped', () => {
    assert.equal(isIgnored('a.ts', '# *.ts\n\n!keep.ts'), false);
    assert.equal(isIgnored('keep.ts', '!keep.ts'), false);
});

test('CRLF line endings in .cortexignore are handled', () => {
    assert.equal(isIgnored('ignored.ts', 'other.ts\r\nignored.ts\r\n'), true);
});

test('isSnapshot accepts what the server returns and rejects anything else', () => {
    const stored = { ...buildSnapshot(facts({})), id: 'abc' };
    assert.equal(isSnapshot(stored), true);
    assert.equal(isSnapshot({ ...stored, branch: null, symbol: null }), true);
    assert.equal(isSnapshot({ ...stored, signatures: [1] }), false);
    assert.equal(isSnapshot({ ...stored, file: undefined }), false);
    assert.equal(isSnapshot(null), false);
    assert.equal(isSnapshot('snapshot'), false);
});
