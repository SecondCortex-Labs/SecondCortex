from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware

from secondcortex.ask import Answer, Complete, LlmUnavailable, ask
from secondcortex.memory import Snapshot, Store

Limit = Annotated[int, Query(ge=1, le=100)]


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    workspace: str | None = None


class Stored(BaseModel):
    id: str


def create_app(store: Store, complete: Complete) -> FastAPI:
    app = FastAPI(title="SecondCortex")
    # Without auth, a DNS-rebinding page could read memory through the browser. Pin the Host header.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost"])

    @app.post("/snapshots")
    def put_snapshot(snapshot: Snapshot) -> Stored:
        """Safe to resend: the offline queue's replays converge on one record."""
        return Stored(id=store.put(snapshot))

    @app.get("/snapshots")
    def recent_snapshots(limit: Limit = 20, workspace: str | None = None) -> list[Snapshot]:
        """Timeline, newest first."""
        return store.recent(limit, workspace)

    @app.get("/snapshots/{snapshot_id}")
    def get_snapshot(snapshot_id: str) -> Snapshot:
        snapshot = store.get(snapshot_id)
        if snapshot is None:
            raise HTTPException(404, "snapshot not found")
        return snapshot

    @app.get("/search")
    def search_snapshots(
        q: Annotated[str, Query(min_length=1)], limit: Limit = 10, workspace: str | None = None
    ) -> list[Snapshot]:
        """Most similar first."""
        return store.search(q, limit, workspace)

    @app.post("/ask")
    def ask_question(body: Question) -> Answer:
        return ask(body.question, store, complete, body.workspace)

    @app.exception_handler(LlmUnavailable)
    async def llm_unavailable(request: Request, error: LlmUnavailable) -> JSONResponse:
        return JSONResponse({"detail": str(error)}, status_code=502)

    return app
