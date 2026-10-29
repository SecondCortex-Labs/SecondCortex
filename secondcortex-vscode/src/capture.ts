import * as vscode from 'vscode';
import { repositoryAt } from './git';
import type { LocalServer } from './server';
import { buildSnapshot, isIgnored, type CodeSymbol } from './snapshot';

interface Settings {
    readonly captureEnabled: boolean;
    readonly debouncerDelayMs: number;
}

function setting<K extends keyof Settings>(key: K): Settings[K] {
    return vscode.workspace.getConfiguration('secondcortex').get(key) as Settings[K];
}

const MAX_COMMANDS = 5;
const SYMBOLS_TIMEOUT_MS = 3_000;
const CODE_KINDS: ReadonlySet<vscode.SymbolKind> = new Set([
    vscode.SymbolKind.Function,
    vscode.SymbolKind.Method,
    vscode.SymbolKind.Class,
]);

type Reason = 'edit' | 'save';

export function startCapture(server: LocalServer, log: (line: string) => void): vscode.Disposable {
    const pending = new Map<string, ReturnType<typeof setTimeout>>();
    const commands = new Map<string, readonly string[]>();

    const cancel = (uri: vscode.Uri) => {
        clearTimeout(pending.get(uri.toString()));
        pending.delete(uri.toString());
    };
    const cancelAll = () => {
        pending.forEach((timer) => clearTimeout(timer));
        pending.clear();
    };
    const capturable = (doc: vscode.TextDocument) => setting('captureEnabled') && doc.uri.scheme === 'file';

    // `at` is taken when the event fires, before any await, so the timestamp is the moment of the save or of
    // the timer and not of whenever the symbol provider answered.
    const capture = async (doc: vscode.TextDocument, reason: Reason, at: Date) => {
        try {
            const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
            if (!folder || doc.isClosed) {
                return;
            }
            const file = doc.uri.path.slice(folder.uri.path.replace(/\/$/, '').length + 1);
            if (!file || isIgnored(file, await readCortexIgnore(folder))) {
                return;
            }
            const [repo, symbols] = await Promise.all([repositoryAt(doc.uri), codeSymbols(doc)]);
            server.deliver(
                buildSnapshot({
                    workspace: folder.uri.toString(),
                    file,
                    branch: repo?.state.HEAD?.name ?? null,
                    language: doc.languageId,
                    text: doc.getText(),
                    cursorLine: cursorLine(doc),
                    symbols,
                    commands: commands.get(folder.uri.toString()) ?? [],
                    at,
                }),
            );
            log(`captured ${file} (${reason})`);
        } catch (error) {
            log(`capture of ${doc.uri.fsPath} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return vscode.Disposable.from(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const doc = event.document;
            if (event.contentChanges.length === 0 || !capturable(doc)) {
                return;
            }
            cancel(doc.uri);
            const key = doc.uri.toString();
            const timer = setTimeout(() => {
                pending.delete(key);
                void capture(doc, 'edit', new Date());
            }, setting('debouncerDelayMs'));
            pending.set(key, timer);
        }),
        vscode.workspace.onDidSaveTextDocument((doc) => {
            cancel(doc.uri);
            if (capturable(doc)) {
                void capture(doc, 'save', new Date());
            }
        }),
        vscode.workspace.onDidCloseTextDocument((doc) => cancel(doc.uri)),
        vscode.window.onDidEndTerminalShellExecution((event) => {
            const line = event.execution.commandLine.value.trim();
            const cwd = event.execution.cwd;
            const folders = vscode.workspace.workspaceFolders ?? [];
            const folder = cwd ? vscode.workspace.getWorkspaceFolder(cwd) : folders.length === 1 ? folders[0] : undefined;
            if (!line || !folder || !setting('captureEnabled')) {
                return;
            }
            const key = folder.uri.toString();
            commands.set(key, [...(commands.get(key) ?? []), line].slice(-MAX_COMMANDS));
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('secondcortex.captureEnabled') && !setting('captureEnabled')) {
                cancelAll();
            }
        }),
        { dispose: cancelAll },
    );
}

export async function toggleCapture(): Promise<void> {
    const config = vscode.workspace.getConfiguration('secondcortex');
    const enabled = !setting('captureEnabled');
    const target =
        config.inspect('captureEnabled')?.workspaceValue !== undefined
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
    await config.update('captureEnabled', enabled, target);
    void vscode.window.showInformationMessage(
        enabled
            ? 'SecondCortex capture is on.'
            : 'SecondCortex capture is paused. Snapshots already queued will still be sent.',
    );
}

async function codeSymbols(doc: vscode.TextDocument): Promise<CodeSymbol[]> {
    const found = await Promise.race([
        vscode.commands.executeCommand<Array<vscode.DocumentSymbol | vscode.SymbolInformation> | undefined>(
            'vscode.executeDocumentSymbolProvider',
            doc.uri,
        ),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), SYMBOLS_TIMEOUT_MS)),
    ]);
    const convert = (symbols: ReadonlyArray<vscode.DocumentSymbol | vscode.SymbolInformation>): CodeSymbol[] =>
        symbols.flatMap((symbol) => {
            const children = 'children' in symbol ? convert(symbol.children) : [];
            if (!CODE_KINDS.has(symbol.kind)) {
                return children;
            }
            const range = 'location' in symbol ? symbol.location.range : symbol.range;
            const declaration = 'location' in symbol ? range : symbol.selectionRange;
            return [{ name: symbol.name, line: declaration.start.line, start: range.start.line, end: range.end.line, children }];
        });
    return convert(found ?? []);
}

async function readCortexIgnore(folder: vscode.WorkspaceFolder): Promise<string> {
    try {
        return new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, '.cortexignore')));
    } catch {
        return '';
    }
}

function cursorLine(doc: vscode.TextDocument): number {
    const active = vscode.window.activeTextEditor;
    const editor = active?.document === doc ? active : vscode.window.visibleTextEditors.find((e) => e.document === doc);
    return editor?.selection.active.line ?? 0;
}
