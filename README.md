<div align="center">
<img src="logo%20kit/Group%202.png" alt="SecondCortex" width="512">

<h1>SecondCortex</h1>

<p>A memory of your coding sessions that runs on your own machine.</p>
</div>

SecondCortex records what you open, edit, and run in VS Code, strips secrets before anything leaves the editor, and keeps it in a local store. You can ask the sidebar what you were doing, jump back to an earlier branch and file, and let coding agents such as Claude Code or Codex search the same memory over MCP. There are no accounts and no hosted backend.

## How it fits together

```
VS Code extension                       secondcortex (local Python process, 127.0.0.1:8732)
  capture, redact, queue  ── POST /snapshots ──▶  store: Chroma + a local embedding model
  sidebar                 ── POST /ask ────────▶  one call to OpenAI or Ollama
  resurrect (git checkout, open file)
                                                    ▲
Claude Code / Codex / Cursor ─── MCP stdio ─────────┘  (secondcortex mcp)
```

- The extension redacts every snapshot before it is queued, so secrets never reach the server or the queue on disk.
- Storing and searching use a local embedding model and need no API key. Only `Ask` calls a language model.
- The MCP tools return raw snapshots. The calling agent does the reasoning.

## Get started

1. Start the server. From `secondcortex-local/`:

   ```sh
   pip install -e .
   secondcortex serve
   ```

   The first start downloads the embedding model (about 80 MB). For `Ask`, set `OPENAI_API_KEY`, or point `SECONDCORTEX_LLM_BASE_URL` at Ollama. See [secondcortex-local/README.md](secondcortex-local/README.md).

2. Install the extension. From `secondcortex-vscode/`:

   ```sh
   npm install
   npm run vsix
   code --install-extension secondcortex-0.2.0.vsix
   ```

   See [secondcortex-vscode/README.md](secondcortex-vscode/README.md) for what it captures, its commands, and its settings.

3. Connect an agent (optional):

   ```sh
   claude mcp add secondcortex -- secondcortex mcp
   ```

## Repository

| Path | What it is |
| --- | --- |
| `secondcortex-local/` | The server: HTTP API for the extension, MCP stdio server for agents. Python. |
| `secondcortex-vscode/` | The VS Code extension. TypeScript. |
| `secondcortex-web/` | The marketing site at secondcortex.tech. Next.js, deployed on Vercel. |
| `docs/` | Design notes and specs. |

## Develop

```sh
cd secondcortex-local && python -m pytest -q -p no:cacheprovider
cd secondcortex-vscode && npm test
cd secondcortex-vscode && npm run test:integration   # launches VS Code against a real server
cd secondcortex-web && npm run build
```

The extension's integration test needs a Python with the server's dependencies. Set `SECONDCORTEX_PYTHON` to it if it is not the repository's `.venv`.

## License

MIT
