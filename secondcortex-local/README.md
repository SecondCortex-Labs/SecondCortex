# SecondCortex local

A developer memory that runs on your machine. The VS Code extension sends snapshots of what you are editing. You ask questions about your past work, and coding agents search the same memory over MCP. One Python process owns the data. It binds `127.0.0.1` only and has no accounts or auth.

## Run it

Install once from this directory, or skip the install and run `python -m secondcortex` here.

```sh
pip install -e .
python -m secondcortex serve   # HTTP API on http://127.0.0.1:8732, memory in ~/.secondcortex
python -m secondcortex mcp     # MCP stdio server for agents, needs `serve` running
```

`serve` stores and searches with a local embedding model and calls no LLM. Only `POST /ask` calls one.

## Environment

| Variable | Default |
| --- | --- |
| `SECONDCORTEX_DATA_DIR` | `~/.secondcortex` |
| `SECONDCORTEX_PORT` | `8732` |
| `SECONDCORTEX_LLM_BASE_URL` | `https://api.openai.com/v1` (Ollama: `http://localhost:11434/v1`) |
| `SECONDCORTEX_LLM_MODEL` | `gpt-4o-mini` |
| `SECONDCORTEX_LLM_API_KEY`, else `OPENAI_API_KEY` | none (Ollama needs none) |

Set the same `SECONDCORTEX_PORT` for `serve` and `mcp`. There is no host setting.

## Connect Claude Code

```sh
claude mcp add secondcortex -- secondcortex mcp
```

Or put this in `.mcp.json`:

```json
{ "mcpServers": { "secondcortex": { "command": "secondcortex", "args": ["mcp"] } } }
```

The agent gets three read-only tools: `search_memory`, `recent_snapshots`, and `get_snapshot`. If `serve` is not running, a tool error says to start it.

## HTTP API

| Route | Does |
| --- | --- |
| `POST /snapshots` | Ingest a snapshot. Safe to resend. Returns `{"id"}`. |
| `GET /snapshots?limit=&workspace=` | Newest first. |
| `GET /snapshots/{id}` | One snapshot, or 404. |
| `GET /search?q=&limit=&workspace=` | Most similar first. |
| `POST /ask` | `{"question", "workspace"?}` returns `{"answer", "sources"}`. |

A snapshot has the fields `workspace`, `file`, `branch`, `timestamp`, `language`, `symbol`, `signatures`, `commands`, and `excerpt`. The `id` is a hash of workspace, file, branch, and the 10-minute UTC bucket of `timestamp`, so a resend replaces the record. The newest timestamp in a bucket wins. Unknown fields and timestamps without an offset return 422.

## Test

```sh
python -m pytest -q -p no:cacheprovider
```

The tests use the real embedding model from `~/.cache/chroma` and need no network.
