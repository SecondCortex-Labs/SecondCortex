// The temp workspace, shared by run.ts (which writes it) and suite.ts (which asserts against it).

/** Short enough to observe the debounce in seconds, and well above the 1 s bound the save assertion uses. */
export const DEBOUNCE_MS = 2_000;
export const BRANCH = 'feature/resurrect-me';
/** Neither may appear anywhere in a stored snapshot. */
export const SECRETS = ['hunter2-not-real', 'tok-live-0123456789abcdef'] as const;
export const TOKEN_LINE = `    const apiToken = "${SECRETS[1]}";`;

/** Workspace-relative path to content. app.ts carries a secret in a default argument, the signature leak the old extension had. */
export const FILES: Readonly<Record<string, string>> = {
    'src/app.ts': `export function connect(url: string, password = "${SECRETS[0]}") {\n    return { url, password };\n}\n`,
    'src/other.ts': 'export const answer = 42;\n',
    'ignored.ts': 'export const hidden = true;\n',
    '.cortexignore': 'ignored.ts\n',
};
