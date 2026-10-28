import argparse
from collections.abc import Sequence
from pathlib import Path

from pydantic import AliasChoices, Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

HOST = "127.0.0.1"


class Settings(BaseSettings):
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
    import httpx

    from secondcortex.mcp_server import build_server

    with httpx.Client(base_url=f"http://{HOST}:{settings.port}", timeout=30) as http:
        build_server(http).run("stdio")
