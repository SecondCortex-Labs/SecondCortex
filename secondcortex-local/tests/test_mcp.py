from typing import Any

import anyio
import httpx
import pytest
from fastapi.testclient import TestClient
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.exceptions import ToolError

from conftest import at, closed_port, ingest, snap
from secondcortex.mcp_server import build_server


def call(server: FastMCP, tool: str, **arguments: object) -> Any:
    """The structured result an MCP client reads: {"result": [...]} for list tools, the object itself otherwise."""
    _, structured = anyio.run(server.call_tool, tool, arguments)
    return structured


def test_tools_return_raw_snapshots(client: TestClient) -> None:
    retry_id = ingest(client, timestamp=at(1))
    ingest(
        client,
        workspace="file:///c%3A/code/marketing-site",
        file="styles/button.css",
        language="css",
        symbol=None,
        signatures=[],
        commands=["npm run build:css"],
        excerpt=".btn { border-radius: 4px; background: #1a73e8; color: white; }",
        timestamp=at(5),
    )
    server = build_server(client)
    timeline = client.get("/snapshots").json()

    assert call(server, "recent_snapshots")["result"] == timeline
    assert call(server, "recent_snapshots", workspace=snap()["workspace"])["result"] == [timeline[1]]
    assert call(server, "search_memory", query="exponential backoff with jitter", limit=1)["result"] == [timeline[1]]
    assert call(server, "get_snapshot", snapshot_id=retry_id) == timeline[1]


def test_tools_are_the_three_read_only_ones(client: TestClient) -> None:
    names = {tool.name for tool in anyio.run(build_server(client).list_tools)}
    assert names == {"search_memory", "recent_snapshots", "get_snapshot"}


def test_unknown_snapshot_id_is_a_tool_error(client: TestClient) -> None:
    with pytest.raises(ToolError, match="nope"):
        call(build_server(client), "get_snapshot", snapshot_id="nope")


def test_server_not_running_tells_the_agent_how_to_start_it() -> None:
    with httpx.Client(base_url=f"http://127.0.0.1:{closed_port()}") as nothing_listening:
        with pytest.raises(ToolError, match="secondcortex serve"):
            call(build_server(nothing_listening), "recent_snapshots")
