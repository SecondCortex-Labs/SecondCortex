// Hosts media/sidebar.{html,css,js} and answers its messages. Holds no transcript: the webview owns that.
import * as vscode from 'vscode';
import type { FromWebview, Source, ToWebview } from './protocol';
import { openSnapshotFile } from './resurrect';
import type { LocalServer } from './server';
import type { Snapshot } from './snapshot';

export class SidebarView implements vscode.WebviewViewProvider {
    /** Matches `contributes.views` in package.json; VS Code derives the `secondcortex.sidebar.focus` command from it. */
    static readonly viewId = 'secondcortex.sidebar';

    /** The live view, replaced if VS Code re-resolves it, so a reply to an in-flight ask reaches the current webview. */
    private view: vscode.WebviewView | undefined;

    constructor(private readonly extensionUri: vscode.Uri, private readonly server: LocalServer) {}

    /**
     * Serves media/sidebar.html with its two placeholders filled: `{{cspSource}}` (the CSP allows scripts and
     * styles only from there, nothing inline) and `{{media}}` (the webview URI of media/).
     */
    async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
        this.view = view;
        const media = vscode.Uri.joinPath(this.extensionUri, 'media');
        view.webview.options = { enableScripts: true, localResourceRoots: [media] };
        view.webview.onDidReceiveMessage((message: unknown) => void this.receive(message));
        view.onDidDispose(() => {
            if (this.view === view) {
                this.view = undefined;
            }
        });
        const template = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(media, 'sidebar.html')));
        view.webview.html = template
            .replaceAll('{{cspSource}}', view.webview.cspSource)
            .replaceAll('{{media}}', view.webview.asWebviewUri(media).toString());
    }

    private async receive(raw: unknown): Promise<void> {
        const message = parseMessage(raw);
        if (!message) {
            return;
        }
        switch (message.type) {
            case 'ask': {
                const result = await this.server.ask(message.question, currentFolder()?.uri.toString());
                this.post(
                    result.ok
                        ? { type: 'answer', id: message.id, answer: result.value.answer, sources: result.value.sources.map(toSource) }
                        : { type: 'error', id: message.id, message: result.message },
                );
                return;
            }
            case 'open':
                return openSnapshotFile(message);
            default: {
                const unhandled: never = message;
                return unhandled;
            }
        }
    }

    private post(message: ToWebview): void {
        void this.view?.webview.postMessage(message);
    }
}

/** The workspace folder of the active editor, else the first folder. Scopes `ask`. */
function currentFolder(): vscode.WorkspaceFolder | undefined {
    const doc = vscode.window.activeTextEditor?.document;
    return (doc && vscode.workspace.getWorkspaceFolder(doc.uri)) ?? vscode.workspace.workspaceFolders?.[0];
}

/** The webview is a process boundary: check the shape before trusting `type`. */
function parseMessage(raw: unknown): FromWebview | undefined {
    const m = raw as Record<string, unknown> | null;
    if (typeof m !== 'object' || m === null) {
        return undefined;
    }
    if (m.type === 'ask' && typeof m.id === 'number' && typeof m.question === 'string' && m.question.trim() !== '') {
        return { type: 'ask', id: m.id, question: m.question };
    }
    // openSnapshotFile validates what the strings contain.
    if (m.type === 'open' && typeof m.workspace === 'string' && typeof m.file === 'string') {
        return { type: 'open', workspace: m.workspace, file: m.file };
    }
    return undefined;
}

/** Trims a snapshot to what the sidebar shows, which keeps the webview's persisted transcript small. */
function toSource({ workspace, file, branch, symbol, timestamp }: Snapshot): Source {
    return { workspace, file, branch, symbol, timestamp };
}
