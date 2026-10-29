// The one place that touches the built-in git extension. Capture reads the branch, resurrect checks one out.
import * as vscode from 'vscode';

/**
 * The subset of the git extension's API version 1 (vscode extensions/git/src/api/git.d.ts) this extension
 * uses. Declared here because the git extension ships no typings package.
 */
export interface Repository {
    readonly rootUri: vscode.Uri;
    readonly state: { readonly HEAD: { readonly name?: string } | undefined };
    /** Rejects, changing nothing, when local edits would be overwritten. */
    checkout(treeish: string): Promise<void>;
}

type ApiState = 'uninitialized' | 'initialized';

interface GitApi {
    readonly state: ApiState;
    readonly onDidChangeState: vscode.Event<ApiState>;
    getRepository(uri: vscode.Uri): Repository | null;
}

interface GitExtension {
    readonly enabled: boolean;
    getAPI(version: 1): GitApi;
}

/** Waiting longer than this for git's first repository scan would hold a save's snapshot hostage. */
const INIT_TIMEOUT_MS = 10_000;

/**
 * The repository containing `uri` (a file or a workspace folder), or undefined when git is disabled,
 * missing, or `uri` is not in a repository. Waits for the git extension to activate and finish its first
 * repository scan, so a snapshot taken right after startup gets the real branch instead of null.
 */
export async function repositoryAt(uri: vscode.Uri): Promise<Repository | undefined> {
    const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (!extension) {
        return undefined;
    }
    const exports = extension.isActive ? extension.exports : await extension.activate();
    if (!exports.enabled) {
        return undefined;
    }
    const git = exports.getAPI(1);
    if (git.state !== 'initialized') {
        await new Promise<void>((resolve) => {
            const listener = git.onDidChangeState(() => settle());
            const timer = setTimeout(() => settle(), INIT_TIMEOUT_MS);
            function settle(): void {
                listener.dispose();
                clearTimeout(timer);
                resolve();
            }
        });
    }
    return git.getRepository(uri) ?? undefined;
}
