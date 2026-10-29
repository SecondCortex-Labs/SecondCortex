import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import type { Snapshot } from '../../src/snapshot';
import { BRANCH, DEBOUNCE_MS, SECRETS, TOKEN_LINE } from './fixture';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Entry point @vscode/test-electron calls; throwing fails the run. */
export async function run(): Promise<void> {
    const extension = vscode.extensions.getExtension('secondcortex-labs.secondcortex');
    assert.ok(extension, 'the extension under test is loaded');
    await extension.activate();
    const folder = vscode.workspace.workspaceFolders![0];

    await registersItsCommands();
    await savingTakesOneRedactedSnapshot(folder);
    await editingTakesASnapshotAfterTheDelay(folder);
    await ignoredFilesAreNeverSent(folder);
}

async function registersItsCommands(): Promise<void> {
    const registered = await vscode.commands.getCommands(true);
    for (const command of ['secondcortex.resurrectWorkspace', 'secondcortex.askQuestion', 'secondcortex.toggleCapture']) {
        assert.ok(registered.includes(command), `${command} is registered`);
    }
    await vscode.commands.executeCommand('secondcortex.askQuestion');
}

/**
 * The debounce is well above the 1 s bound, so a late duplicate from an uncancelled timer would carry a
 * timestamp later than it and, newest wins, replace the save's record.
 */
async function savingTakesOneRedactedSnapshot(folder: vscode.WorkspaceFolder): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, 'src/app.ts'));
    const editor = await vscode.window.showTextDocument(doc);
    await eventually('the TypeScript server reports connect', 60_000, async () => {
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', doc.uri);
        return symbols?.some((symbol) => symbol.name === 'connect') ?? false;
    });
    await editor.edit((edit) => edit.insert(new vscode.Position(1, 0), `${TOKEN_LINE}\n`));
    editor.selection = new vscode.Selection(1, 10, 1, 10);

    const savedAt = Date.now();
    assert.ok(await doc.save(), 'the document saved');
    await storedSnapshots(folder, (all) => all.some((s) => s.file === 'src/app.ts'), 15_000);
    await sleep(DEBOUNCE_MS + 3_000);

    const all = await storedSnapshots(folder, () => true, 0);
    const stored = all.filter((s) => s.file === 'src/app.ts');
    assert.equal(stored.length, 1, `one snapshot for src/app.ts, got ${JSON.stringify(stored.map((s) => s.timestamp))}`);
    const [snapshot] = stored;
    assert.equal(snapshot.workspace, folder.uri.toString(), 'workspace is the root URI, not the folder name');
    assert.equal(snapshot.branch, BRANCH);
    assert.equal(snapshot.language, 'typescript');
    assert.equal(snapshot.symbol, 'connect');
    assert.ok(
        snapshot.signatures.includes('export function connect(url: string, password = "[REDACTED]") {'),
        `signature was ${JSON.stringify(snapshot.signatures)}`,
    );
    assert.ok(snapshot.excerpt.includes('[REDACTED]'), 'the token line is in the excerpt, redacted');
    for (const secret of SECRETS) {
        assert.ok(!JSON.stringify(all).includes(secret), `${secret} appears nowhere in the stored records`);
    }
    const stamped = Date.parse(snapshot.timestamp);
    assert.ok(stamped >= savedAt && stamped <= savedAt + 1_000, `timestamp ${snapshot.timestamp} is the save's, not a later debounce's`);
}

async function editingTakesASnapshotAfterTheDelay(folder: vscode.WorkspaceFolder): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, 'src/other.ts'));
    const editor = await vscode.window.showTextDocument(doc);
    const editedAt = Date.now();
    await editor.edit((edit) => edit.insert(new vscode.Position(1, 0), 'export const question = 7;\n'));

    const all = await storedSnapshots(folder, (found) => found.some((s) => s.file === 'src/other.ts'), DEBOUNCE_MS + 5_000);
    const snapshot = all.find((s) => s.file === 'src/other.ts');
    assert.ok(snapshot, 'a snapshot for src/other.ts arrived without a save');
    assert.ok(Date.parse(snapshot.timestamp) >= editedAt + DEBOUNCE_MS - 50, `timestamp ${snapshot.timestamp} is after the debounce delay`);
    assert.ok(snapshot.excerpt.includes('export const question = 7;'), 'the unsaved edit is in the excerpt');
}

async function ignoredFilesAreNeverSent(folder: vscode.WorkspaceFolder): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, 'ignored.ts'));
    const editor = await vscode.window.showTextDocument(doc);
    await editor.edit((edit) => edit.insert(new vscode.Position(1, 0), 'export const more = 1;\n'));
    await doc.save();
    await sleep(DEBOUNCE_MS + 3_000);

    const all = await storedSnapshots(folder, () => true, 0);
    assert.deepEqual(all.filter((s) => s.file === 'ignored.ts'), [], 'nothing was stored for the ignored file');
}

async function storedSnapshots(folder: vscode.WorkspaceFolder, until: (all: Snapshot[]) => boolean, timeoutMs: number): Promise<Snapshot[]> {
    const query = new URLSearchParams({ workspace: folder.uri.toString(), limit: '100' });
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const res = await fetch(`${process.env.SECONDCORTEX_TEST_URL}/snapshots?${query}`);
        assert.equal(res.status, 200, 'GET /snapshots');
        const all = (await res.json()) as Snapshot[];
        if (until(all) || Date.now() >= deadline) {
            return all;
        }
        await sleep(250);
    }
}

async function eventually(what: string, timeoutMs: number, check: () => Promise<boolean>): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!(await check())) {
        assert.ok(Date.now() < deadline, `timed out waiting until ${what}`);
        await sleep(250);
    }
}
