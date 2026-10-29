import * as vscode from 'vscode';
import { startCapture, toggleCapture } from './capture';
import { resurrect } from './resurrect';
import { LocalServer } from './server';
import { SidebarView } from './sidebar';

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel('SecondCortex');
    const log = (line: string) => output.appendLine(`${new Date().toISOString()} ${line}`);
    // Constructed synchronously: it loads the persisted queue before any listener can deliver.
    const server = new LocalServer(
        context.workspaceState,
        () => vscode.workspace.getConfiguration('secondcortex').get('backendUrl') as string,
        log,
    );
    context.subscriptions.push(
        output,
        server,
        startCapture(server, log),
        vscode.window.registerWebviewViewProvider(SidebarView.viewId, new SidebarView(context.extensionUri, server), {
            webviewOptions: { retainContextWhenHidden: true },
        }),
        vscode.commands.registerCommand('secondcortex.resurrectWorkspace', () => resurrect(server)),
        vscode.commands.registerCommand('secondcortex.askQuestion', () =>
            vscode.commands.executeCommand(`${SidebarView.viewId}.focus`),
        ),
        vscode.commands.registerCommand('secondcortex.toggleCapture', toggleCapture),
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                void server.flush();
            }
        }),
    );
    void server.flush();
}
