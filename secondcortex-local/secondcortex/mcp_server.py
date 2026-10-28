"""MCP stdio server for coding agents: three read-only tools over the running HTTP server.

It never opens the data directory. A long-lived second process on the same Chroma directory
misses other processes' writes in vector search (measured), and Store's owner lock would refuse
it anyway. The tools return raw snapshot JSON; the calling agent does the reasoning.
"""

import urllib.parse
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ToolError

_INSTRUCTIONS = (
    "SecondCortex is the developer's local memory of past editor sessions: which file, branch, "
    "function, terminal commands, and a redacted code excerpt, captured every few minutes. "
    "Search it before asking the developer what they were doing."
)


def build_server(http: httpx.Client) -> FastMCP:
    """Tools bound to `http`, whose base_url is the local SecondCortex server.

    Tests pass a FastAPI TestClient (an httpx.Client) over the real app.
    """
    server = FastMCP("secondcortex", instructions=_INSTRUCTIONS)

    def fetch(path: str, params: dict[str, Any]) -> Any:
        """GET and decode JSON, turning transport and HTTP failures into ToolErrors an agent can act on."""
        try:
            response = http.get(path, params={k: v for k, v in params.items() if v is not None})
        except httpx.TransportError as error:
            raise ToolError(
                f"SecondCortex is not running at {http.base_url}. Start it with `secondcortex serve`."
            ) from error
        if response.status_code == 404:
            raise ToolError(f"No snapshot at {path}")
        response.raise_for_status()
        return response.json()

    @server.tool()
    def search_memory(query: str, limit: int = 5, workspace: str | None = None) -> list[dict[str, Any]]:
        """Snapshots most similar to `query`, best first. `workspace` limits results to one workspace."""
        return fetch("/search", {"q": query, "limit": limit, "workspace": workspace})

    @server.tool()
    def recent_snapshots(limit: int = 10, workspace: str | None = None) -> list[dict[str, Any]]:
        """The developer's most recent snapshots, newest first."""
        return fetch("/snapshots", {"limit": limit, "workspace": workspace})

    @server.tool()
    def get_snapshot(snapshot_id: str) -> dict[str, Any]:
        """One snapshot by the `id` another tool returned."""
        return fetch(f"/snapshots/{urllib.parse.quote(snapshot_id, safe='')}", {})

    return server
