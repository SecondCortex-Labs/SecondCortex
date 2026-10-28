"""The composition root, run as real processes: `serve` owns the data directory and `mcp` only talks to it."""

import os
import subprocess
import sys
import time
from collections.abc import Iterator
from pathlib import Path

import anyio
import httpx
import pytest
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from conftest import closed_port, snap
from secondcortex.cli import Settings, main

ROOT = Path(__file__).parent.parent


def secondcortex(*args: str) -> list[str]:
    return [sys.executable, "-m", "secondcortex", *args]


def test_the_mcp_bridge_never_imports_the_storage_or_llm_stack() -> None:
    probe = "import sys, secondcortex.cli, secondcortex.mcp_server; print(sorted({'chromadb', 'onnxruntime', 'openai'} & set(sys.modules)))"
    result = subprocess.run([sys.executable, "-c", probe], cwd=ROOT, capture_output=True, text=True, check=True)
    assert result.stdout.strip() == "[]"


def test_llm_key_falls_back_to_openai_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SECONDCORTEX_LLM_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "from-openai")
    assert Settings().llm_api_key == "from-openai"
    monkeypatch.setenv("SECONDCORTEX_LLM_API_KEY", "from-secondcortex")
    assert Settings().llm_api_key == "from-secondcortex"


def test_a_bad_environment_exits_with_a_message_instead_of_a_traceback(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setenv("SECONDCORTEX_PORT", "80")
    with pytest.raises(SystemExit) as exit_info:
        main(["serve"])
    assert exit_info.value.code == 2
    assert "SECONDCORTEX_" in capsys.readouterr().err


@pytest.fixture
def server_env(data_dir: Path) -> Iterator[dict[str, str]]:
    """A running `secondcortex serve` on a free port over a fresh data directory. Yields its environment."""
    env = {**os.environ, "SECONDCORTEX_DATA_DIR": str(data_dir), "SECONDCORTEX_PORT": str(closed_port())}
    server = subprocess.Popen(
        secondcortex("serve"), cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    deadline = time.monotonic() + 60
    while True:
        assert server.poll() is None, "serve exited during startup"
        try:
            httpx.get(f"http://127.0.0.1:{env['SECONDCORTEX_PORT']}/snapshots")
            break
        except httpx.TransportError:
            assert time.monotonic() < deadline, "serve did not start listening"
            time.sleep(0.2)
    yield env
    server.terminate()
    server.wait(timeout=15)


def test_snapshots_sent_to_serve_are_found_by_an_agent_over_the_mcp_bridge(server_env: dict[str, str]) -> None:
    base = f"http://127.0.0.1:{server_env['SECONDCORTEX_PORT']}"
    assert httpx.post(f"{base}/snapshots", json=snap()).status_code == 200

    async def agent_searches() -> list[dict]:
        params = StdioServerParameters(
            command=sys.executable, args=["-m", "secondcortex", "mcp"], cwd=ROOT, env=server_env
        )
        async with stdio_client(params) as (read, write), ClientSession(read, write) as session:
            await session.initialize()
            reply = await session.call_tool("search_memory", {"query": "exponential backoff with jitter"})
            assert reply.structuredContent is not None
            return reply.structuredContent["result"]

    assert [hit["file"] for hit in anyio.run(agent_searches)] == ["src/retry.py"]


def test_a_second_serve_on_the_same_data_dir_exits_without_touching_it(server_env: dict[str, str]) -> None:
    second = {**server_env, "SECONDCORTEX_PORT": str(closed_port())}
    result = subprocess.run(
        secondcortex("serve"), cwd=ROOT, env=second, capture_output=True, text=True, timeout=60
    )
    assert result.returncode == 1
    assert "in use by another SecondCortex server" in result.stderr
