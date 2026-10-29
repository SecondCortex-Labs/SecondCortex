/** Well above the 1 s bound the save assertion uses. */
export const DEBOUNCE_MS = 2_000;
export const BRANCH = 'feature/resurrect-me';
export const SECRETS = ['hunter2-not-real', 'tok-live-0123456789abcdef'] as const;
export const TOKEN_LINE = `    const apiToken = "${SECRETS[1]}";`;

export const FILES: Readonly<Record<string, string>> = {
    'src/app.ts': `export function connect(url: string, password = "${SECRETS[0]}") {\n    return { url, password };\n}\n`,
    'src/other.ts': 'export const answer = 42;\n',
    'ignored.ts': 'export const hidden = true;\n',
    '.cortexignore': 'ignored.ts\n',
};
