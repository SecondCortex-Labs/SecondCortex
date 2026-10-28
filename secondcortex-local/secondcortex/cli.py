"""`secondcortex serve` and `secondcortex mcp`. The composition root: the only place that reads
the environment, opens the store, or picks a host.

Heavy modules are imported inside the commands that need them, so `mcp` never loads chromadb,
onnxruntime or openai.
"""

import argparse
from collections.abc import Sequence
from pathlib import Path

from pydantic import AliasChoices, Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

HOST = "127.0.0.1"


class Settings(BaseSettings):
    """Environment only (SECONDCORTEX_*). There is deliberately no host setting: no auth means loopback only."""

    model_config = SettingsConfigDict(env_prefix="SECONDCORTEX_")

    data_dir: Path = Path.home() / ".secondcortex"
    port: int = Field(8732, ge=1024, le=65535)
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str | None = Field(
        None, validation_alias=AliasChoices("SECONDCORTEX_LLM_API_KEY", "OPENAI_API_KEY")
    )


def main(argv: Sequence[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="secondcortex", description="Local developer memory.")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("serve", help=f"HTTP API for the VS Code extension on {HOST}")
    commands.add_parser("mcp", help="MCP stdio server for coding agents (needs `serve` running)")
    args = parser.parse_args(argv)
    try:
        settings = Settings()
    except ValidationError as error:
        parser.exit(2, f"secondcortex: invalid SECONDCORTEX_* environment\n{error}\n")
    if args.command == "serve":
        serve(settings)
    else:
        run_mcp(settings)


def serve(settings: Settings) -> None:
    """Open the store before binding, so a second server fails on the lock instead of sharing the directory."""
    import uvicorn

    from secondcortex.app import create_app
    from secondcortex.ask import openai_complete
    from secondcortex.memory import DataDirInUse, Store

    try:
        store = Store(settings.data_dir)
    except DataDirInUse as error:
        raise SystemExit(f"secondcortex: {error} is in use by another SecondCortex server") from None
    with store:
        complete = openai_complete(settings.llm_base_url, settings.llm_model, settings.llm_api_key)
        uvicorn.run(create_app(store, complete), host=HOST, port=settings.port)


def run_mcp(settings: Settings) -> None:
    """stdout is the MCP channel: nothing in this process may print to it."""
    import httpx

    from secondcortex.mcp_server import build_server

    with httpx.Client(base_url=f"http://{HOST}:{settings.port}", timeout=30) as http:
        build_server(http).run("stdio")
