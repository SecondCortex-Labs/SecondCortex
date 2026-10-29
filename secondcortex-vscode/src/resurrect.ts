// Takes the user back to a snapshot: its branch, then its file. Every change is listed and confirmed first.
import * as vscode from 'vscode';
import { repositoryAt, type Repository } from './git';
import type { LocalServer } from './server';
import type { Snapshot } from './snapshot';

/**
 * One action resurrect may take. The confirmation text and the execution both come from the same list,
 * so the dialog always shows exactly what will run.
 */
type Step =
    | { readonly kind: 'checkout'; readonly repo: Repository; readonly branch: string; readonly current: string | undefined }
    | { readonly kind: 'open'; readonly uri: vscode.Uri };

const RECENT_LIMIT = 30;

/**
 * "SecondCortex: Resurrect Workspace". Quick pick of this workspace's recent snapshots (`GET /snapshots`),
 * then one modal confirmation listing every step, then: check out the snapshot's branch through the git
 * extension API when it differs from HEAD, and open its file. No shell, no terminal, no server-made plan.
 */
export async function resurrect(server: LocalServer): Promise<void> {
    const folder = await pickFolder();
    if (!folder) {
        return;
    }
    const result = await server.recent(folder.uri.toString(), RECENT_LIMIT);
    if (!result.ok) {
        void vscode.window.showErrorMessage(result.message);
        return;
    }
    if (result.value.length === 0) {
        void vscode.window.showInformationMessage(
            'No snapshots for this workspace yet. They appear after you edit or save a file.',
        );
        return;
    }
    const pick = await vscode.window.showQuickPick(
        result.value.map((snapshot) => ({
            label: snapshot.file,
            description: [snapshot.symbol, snapshot.branch].filter(Boolean).join(' · '),
            detail: new Date(snapshot.timestamp).toLocaleString(),
            snapshot,
        })),
        { placeHolder: 'Pick a snapshot to go back to', matchOnDescription: true },
    );
    if (!pick) {
        return;
    }
    const target = joinInside(folder.uri, pick.snapshot.file);
    if (!target) {
        void vscode.window.showErrorMessage(`SecondCortex cannot open ${pick.snapshot.file}.`);
        return;
    }
    const steps = await plan(pick.snapshot, folder, target);
    const choice = await vscode.window.showWarningMessage(
        `Resurrect ${pick.snapshot.file} from ${pick.detail}?`,
        { modal: true, detail: steps.map(describe).join('\n') },
        'Resurrect',
    );
    if (choice !== 'Resurrect') {
        return;
    }
    for (const step of steps) {
        if (step.kind === 'open') {
            await openUri(step.uri);
            continue;
        }
        try {
            await step.repo.checkout(step.branch);
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            void vscode.window.showErrorMessage(`Could not check out ${step.branch}: ${reason} Nothing was changed.`);
            return;
        }
    }
}

/**
 * Opens a snapshot's file: `file` joined onto the `workspace` root URI. Used by resurrect and by sidebar
 * source links. Refuses anything that is not a `file:` workspace or that climbs out of it, since both
 * strings come back from the server.
 */
export async function openSnapshotFile(source: Pick<Snapshot, 'workspace' | 'file'>): Promise<void> {
    let uri: vscode.Uri | undefined;
    try {
        const root = vscode.Uri.parse(source.workspace, true);
        uri = root.scheme === 'file' ? joinInside(root, source.file) : undefined;
    } catch {
        uri = undefined;
    }
    if (!uri) {
        void vscode.window.showErrorMessage(`SecondCortex cannot open ${source.file}.`);
        return;
    }
    await openUri(uri);
}

function joinInside(root: vscode.Uri, file: string): vscode.Uri | undefined {
    const parts = file.split('/');
    // A backslash is a separator in the fsPath on Windows but plain text in the URI path.
    const escapes = parts.some((part) => part === '..' || part.includes('\\'));
    return escapes ? undefined : vscode.Uri.joinPath(root, ...parts);
}

async function openUri(uri: vscode.Uri): Promise<void> {
    try {
        await vscode.window.showTextDocument(uri, { preview: false });
    } catch {
        void vscode.window.showErrorMessage(`${uri.fsPath} could not be opened. It may have been moved or deleted.`);
    }
}

/** The only folder, or the user's pick in a multi-root workspace. */
async function pickFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) {
        void vscode.window.showInformationMessage('Open a folder to resurrect its work.');
        return undefined;
    }
    return folders.length === 1 ? folders[0] : vscode.window.showWorkspaceFolderPick({ placeHolder: 'Resurrect which folder?' });
}

async function plan(snapshot: Snapshot, folder: vscode.WorkspaceFolder, target: vscode.Uri): Promise<Step[]> {
    const repo = await repositoryAt(folder.uri);
    const current = repo?.state.HEAD?.name;
    const checkout = snapshot.branch && repo && current !== snapshot.branch;
    return [
        ...(checkout ? [{ kind: 'checkout', repo, branch: snapshot.branch, current } as const] : []),
        { kind: 'open', uri: target } as const,
    ];
}

function describe(step: Step): string {
    return step.kind === 'checkout'
        ? `• Check out branch "${step.branch}" in ${step.repo.rootUri.fsPath} (now on ${step.current ? `"${step.current}"` : 'no branch'}). Git refuses, changing nothing, if local edits conflict.`
        : `• Open ${step.uri.fsPath}.`;
}
