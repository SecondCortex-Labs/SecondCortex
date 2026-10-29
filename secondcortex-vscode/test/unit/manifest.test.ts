import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

const manifest = JSON.parse(readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
const settings = manifest.contributes.configuration.properties;

test('activates on startup finished, not on every event', () => {
    assert.deepEqual(manifest.activationEvents, ['onStartupFinished']);
});

test('requires VS Code 1.93 for the terminal shell integration API', () => {
    assert.equal(manifest.engines.vscode, '^1.93.0');
    // vsce refuses to package when the typings are newer than the engine.
    assert.equal(manifest.devDependencies['@types/vscode'], '~1.93.0');
});

test('contributes exactly the resurrect, ask, and toggle capture commands', () => {
    assert.deepEqual(manifest.contributes.commands.map((c: { command: string }) => c.command).sort(), [
        'secondcortex.askQuestion',
        'secondcortex.resurrectWorkspace',
        'secondcortex.toggleCapture',
    ]);
});

test('declares the three settings with their documented defaults', () => {
    assert.deepEqual(Object.keys(settings).sort(), [
        'secondcortex.backendUrl',
        'secondcortex.captureEnabled',
        'secondcortex.debouncerDelayMs',
    ]);
    assert.equal(settings['secondcortex.backendUrl'].default, 'http://127.0.0.1:8732');
    assert.equal(settings['secondcortex.captureEnabled'].default, true);
    assert.equal(settings['secondcortex.debouncerDelayMs'].default, 30000);
});

test('the sidebar view id is the one the extension registers and focuses', () => {
    assert.equal(manifest.contributes.views.secondcortex[0].id, 'secondcortex.sidebar');
    assert.equal(manifest.contributes.viewsContainers.activitybar[0].id, 'secondcortex');
});

test('ships only minimatch as a runtime dependency', () => {
    assert.deepEqual(Object.keys(manifest.dependencies), ['minimatch']);
    assert.ok(manifest.devDependencies.typescript);
});

test('the entry point is where the compiler writes it', () => {
    assert.equal(manifest.main, './out/src/extension.js');
});
