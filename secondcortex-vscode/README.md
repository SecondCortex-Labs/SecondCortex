# SecondCortex

SecondCortex remembers what you were working on, answers questions about it, and takes you back to it. The extension sends snapshots of your editing to a SecondCortex server that runs on your own machine. It has no accounts and no hosted backend.

## Start the server

The extension never starts the server. From the `secondcortex-local/` directory of this repository, run:

```sh
python -m secondcortex serve
```

The server listens on `http://127.0.0.1:8732`. Its README covers installation, the embedding model download, and the language model settings that `Ask` needs.

While the server is down, the sidebar tells you how to start it. Snapshots wait in a queue that survives restarts, holds up to 500 snapshots, and drops the oldest first. The queue is sent in order when the server returns, when the retry timer fires (every 30 seconds), and when the VS Code window regains focus.

## What a snapshot holds

The extension takes a snapshot 30 seconds after your last edit to a file, and immediately when you save. A save replaces the pending edit snapshot, so one save produces one snapshot. A snapshot records:

- the workspace folder and the file path inside it
- the git branch, read through VS Code's git extension
- the language
- the name of the function, method, or class around your cursor
- the declaration line of each function, method, and class in the file (up to 20)
- the last five terminal commands run in this workspace folder (this needs terminal shell integration)
- about 2,000 characters of whole lines around your cursor

Only files in an open workspace folder are captured. Files outside any folder, and files that are not on disk (such as settings or diffs), are skipped.

## What the server receives

Before a snapshot is queued, the extension replaces secrets with `[REDACTED]` in every field, including the signatures and the terminal commands. It redacts:

- known key formats such as Stripe, AWS, GitHub, OpenAI, JWT, private key blocks, Azure connection strings, and bearer tokens
- any value assigned to a name that contains `key`, `token`, `secret`, `password`, `passwd`, `credential`, or `auth`, in any language

The extension never captures `.env`, `.env.*`, anything under a `secrets/` directory, or a file that matches a line of `.cortexignore` at the workspace root. `.cortexignore` uses gitignore-style patterns. A pattern without a slash matches at any depth, a trailing slash matches a directory, and a leading slash anchors the pattern to the workspace root. Negation with `!` is not supported.

The extension talks only to the server you configured in `secondcortex.backendUrl`. The server sends snapshot text to a language model only when you ask a question, and it sends it to the endpoint set in the server's `SECONDCORTEX_LLM_BASE_URL`. That endpoint is OpenAI unless you point it at a local model such as Ollama.

## Commands

| Command | What it does |
| --- | --- |
| `SecondCortex: Ask a Question` | Focuses the sidebar. Answers cite numbered snapshots, and a citation or a source opens its file. The conversation and your unsent draft stay in the view and are never stored on the server. |
| `SecondCortex: Resurrect Workspace` | Lists the 30 most recent snapshots of the current workspace folder. After you pick one, a confirmation dialog lists the repository, the current and target branch, and the file to open. On confirmation it checks out the branch through VS Code's git integration and opens the file. It runs nothing in a terminal, and git refuses, changing nothing, if local edits conflict. |
| `SecondCortex: Toggle Capture` | Flips `secondcortex.captureEnabled`. Snapshots already queued are still sent. |

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `secondcortex.backendUrl` | `http://127.0.0.1:8732` | The address of the server. The server accepts only the hosts `127.0.0.1` and `localhost`. |
| `secondcortex.captureEnabled` | `true` | Whether snapshots are taken. |
| `secondcortex.debouncerDelayMs` | `30000` | Milliseconds after your last edit to a file before its snapshot. The minimum is 1000. |

## Troubleshooting

The `SecondCortex` output channel logs each capture (file and whether an edit or a save caused it), each snapshot the server rejected with its reason, each retry, and each capture error.

If the sidebar says the server is not running, start it with the command above. If it says the server refused the address, change `secondcortex.backendUrl` to use `127.0.0.1` or `localhost`.

## Requirements

VS Code 1.93 or later and a running SecondCortex server. Branch names need VS Code's built-in git extension. Terminal commands need terminal shell integration, which VS Code enables for bash, zsh, fish, and PowerShell by default.

## License

MIT. See [LICENSE](LICENSE).
