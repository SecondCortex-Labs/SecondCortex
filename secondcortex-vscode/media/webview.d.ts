// Globals VS Code gives the sidebar webview. Type-checking only; excluded from the VSIX.

interface WebviewApi<S> {
    postMessage(message: import('../src/protocol').FromWebview): void;
    getState(): S | undefined;
    setState(state: S): void;
}

declare function acquireVsCodeApi<S>(): WebviewApi<S>;
