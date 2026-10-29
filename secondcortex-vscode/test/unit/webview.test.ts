import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const media = path.join(__dirname, '../../../media');
const script = readFileSync(path.join(media, 'sidebar.js'), 'utf8');
const html = readFileSync(path.join(media, 'sidebar.html'), 'utf8');
const csp = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';

test('the sidebar script never hands a string to an HTML parser or an evaluator', () => {
    for (const sink of [/\binnerHTML\b/, /\bouterHTML\b/, /insertAdjacentHTML/, /document\.write/, /\beval\(/, /new Function\(/, /\bsrcdoc\b/]) {
        assert.doesNotMatch(script, sink);
    }
});

test('the CSP denies everything by default and allows no inline or eval code', () => {
    assert.ok(csp.startsWith("default-src 'none'"), csp);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
});

test('the page loads script and style only from the webview resource origin', () => {
    assert.match(csp, /(^|; )script-src \{\{cspSource\}\}(;|$)/);
    assert.match(csp, /(^|; )style-src \{\{cspSource\}\}(;|$)/);
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    assert.match(scripts[0][1], /src="\{\{media\}\}\/sidebar\.js"/);
    assert.equal(scripts[0][2].trim(), '', 'no inline script body');
    assert.doesNotMatch(html, /\son\w+=|<style\b|style="/i, 'no inline handlers or styles');
});
