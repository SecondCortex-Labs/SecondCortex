import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';
import { BRANCH, DEBOUNCE_MS, FILES } from './fixture';

const EXTENSION_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(EXTENSION_ROOT, '..');
const PYTHON = process.env.SECONDCORTEX_PYTHON ?? path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe');
const VSCODE =
    process.env.SECONDCORTEX_VSCODE ?? path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Microsoft VS Code', 'Code.exe');
const SERVER_READY_MS = 60_000;

async function main(): Promise<void> {
    const temp = await mkdtemp(path.join(tmpdir(), 'secondcortex-it-'));
    const [dataDir, workspace, userData, extensions] = ['data', 'workspace', 'user-data', 'extensions'].map((d) => path.join(temp, d));
    const port = await freePort();
    let server: ChildProcess | undefined;
    try {
        server = await startServer(dataDir, port);
        await makeWorkspace(workspace, port);
        await runTests({
            vscodeExecutablePath: VSCODE,
            extensionDevelopmentPath: EXTENSION_ROOT,
            extensionTestsPath: path.join(__dirname, 'suite.js'),
            extensionTestsEnv: { SECONDCORTEX_TEST_URL: `http://127.0.0.1:${port}` },
            // --disable-extensions leaves the built-ins (git, TypeScript language features) on, which the suite relies on.
            launchArgs: [
                workspace,
                '--disable-extensions',
                '--disable-workspace-trust',
                '--skip-welcome',
                '--skip-release-notes',
                `--user-data-dir=${userData}`,
                `--extensions-dir=${extensions}`,
            ],
        });
    } finally {
        if (server) {
            await stopServer(server);
        }
        await rm(temp, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    }
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address() as { port: number };
            probe.close(() => resolve(port));
        });
    });
}

async function startServer(dataDir: string, port: number): Promise<ChildProcess> {
    const server = spawn(PYTHON, ['-m', 'secondcortex', 'serve'], {
        cwd: path.join(REPO_ROOT, 'secondcortex-local'),
        env: { ...process.env, SECONDCORTEX_DATA_DIR: dataDir, SECONDCORTEX_PORT: String(port) },
        stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    let spawnError: Error | undefined;
    server.stderr!.on('data', (chunk: Buffer) => (stderr += chunk));
    server.once('error', (error) => (spawnError = error));
    const deadline = Date.now() + SERVER_READY_MS;
    while (Date.now() < deadline) {
        if (spawnError) {
            throw new Error(`could not start ${PYTHON} (set SECONDCORTEX_PYTHON): ${spawnError.message}`);
        }
        if (server.exitCode !== null) {
            throw new Error(`secondcortex serve exited with ${server.exitCode}\n${stderr}`);
        }
        try {
            if ((await fetch(`http://127.0.0.1:${port}/snapshots?limit=1`)).ok) {
                return server;
            }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await stopServer(server);
    throw new Error(`secondcortex serve was not ready within ${SERVER_READY_MS / 1000} s\n${stderr}`);
}

/** The venv's python.exe is a launcher that spawns the real interpreter, so on Windows the whole tree goes. */
async function stopServer(server: ChildProcess): Promise<void> {
    if (server.exitCode !== null || server.pid === undefined) {
        return;
    }
    const exited = new Promise((resolve) => server.once('exit', resolve));
    if (process.platform === 'win32') {
        execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
        server.kill();
    }
    await exited;
}

async function makeWorkspace(dir: string, port: number): Promise<void> {
    const settings = { 'secondcortex.backendUrl': `http://127.0.0.1:${port}`, 'secondcortex.debouncerDelayMs': DEBOUNCE_MS };
    const files = { ...FILES, '.vscode/settings.json': JSON.stringify(settings) };
    for (const [file, content] of Object.entries(files)) {
        await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
        await writeFile(path.join(dir, file), content);
    }
    const git = (...args: string[]) =>
        execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, stdio: 'ignore' });
    git('init', '-q');
    git('add', '-A');
    git('commit', '-q', '-m', 'initial');
    git('checkout', '-q', '-b', BRANCH);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
