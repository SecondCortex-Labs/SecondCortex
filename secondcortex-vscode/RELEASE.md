# Releasing the SecondCortex VS Code extension

This guide covers testing, packaging, and publishing `secondcortex` to the VS Code Marketplace.

## One-time setup

1. Create a publisher at `https://marketplace.visualstudio.com/manage`. Its ID must match `publisher` in `package.json`, which is `secondcortex-labs`.
2. Create an Azure DevOps personal access token with the `Marketplace (Manage)` scope.
3. Log in. The npm scripts call `vsce` through `npx`, so a global install is optional.

```sh
cd secondcortex-vscode
npx @vscode/vsce login secondcortex-labs
```

Paste the token when `vsce` asks for it.

## Test before you release

```sh
npm test
npm run test:integration
```

`npm test` compiles the extension, type-checks `media/sidebar.js` against `src/protocol.ts`, and runs the unit tests with `node --test`. It needs no VS Code and no server.

`npm run test:integration` starts a real `python -m secondcortex serve` on a temporary data directory and a free port, opens a temporary git workspace in your installed VS Code, edits and saves files, and checks what the server stored. It needs three things on the machine.

- A Python environment that can run `secondcortex`. The test uses `.venv/Scripts/python.exe` at the repository root. Set `SECONDCORTEX_PYTHON` to use another interpreter.
- A VS Code install. The test uses `%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe`. Set `SECONDCORTEX_VSCODE` to use another executable.
- The embedding model already downloaded to `~/.cache/chroma`, which the first `python -m secondcortex serve` does. The test makes no network requests.

The run takes about 35 seconds. It starts VS Code with `--disable-extensions`, which leaves the built-in git and TypeScript extensions on.

## Package

```sh
npm run vsix
npx @vscode/vsce ls
```

`npm run vsix` runs the compile through `vscode:prepublish` and writes `secondcortex-<version>.vsix` in this folder. `vsce ls` prints the files that the package contains. Check that it lists `out/src/*.js`, `media/`, and the runtime dependency `minimatch`, and that it lists no `src/`, `test/`, or `out/test/`. `.vscodeignore` controls the list.

`vsce` refuses to package when `@types/vscode` is newer than `engines.vscode`. Keep the two on the same minor version, which `test/unit/manifest.test.ts` checks.

## Publish

```sh
npm run publish:patch
npm run publish:minor
npm run publish:major
```

Use `patch` for fixes, `minor` for new behavior, and `major` for a change that breaks users. Each command bumps `version` in `package.json` and publishes. To choose the version yourself, run `npm version <x.y.z> --no-git-tag-version`, then `npx @vscode/vsce publish`.

## Test an installed package

```sh
code --install-extension ./secondcortex-<version>.vsix --force
```

Run **Developer: Reload Window**, start the server with `python -m secondcortex serve`, and edit a file. The `SecondCortex` output channel logs each capture.

## Troubleshooting

- A `403` or an authentication error means the token has the wrong scope or has expired. Run `npx @vscode/vsce login secondcortex-labs` again.
- "Version already exists" means you must bump `version` and publish again.
- An installed extension that looks unchanged needs a higher `version`, a reinstall with `--force`, and a window reload.
