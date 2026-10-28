"""The developer's memory: what a snapshot is, how it is identified, and the one store that keeps it.

Everything that knows about Chroma lives in this file. Callers see `Snapshot` and `Store`.
"""

from __future__ import annotations

import hashlib
import json
import sys
import threading
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from functools import cache
from pathlib import Path
from types import TracebackType
from typing import IO, Annotated, Any, Self

import chromadb
from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    PlainSerializer,
    computed_field,
    field_validator,
    model_validator,
)

BUCKET = timedelta(minutes=10)
_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)
_COLLECTION = "snapshots"
_RECENT_WINDOWS: tuple[timedelta | None, ...] = (
    timedelta(days=1),
    timedelta(days=7),
    timedelta(days=30),
    timedelta(days=365),
    None,
)


def _utc_millis(value: datetime) -> datetime:
    """Normalize to UTC at millisecond precision so the stored record round-trips exactly."""
    return value.astimezone(UTC).replace(microsecond=value.microsecond // 1000 * 1000)


def _iso_millis(value: datetime) -> str:
    """One fixed-width spelling on the wire. Pydantic's default drops the fraction at .000 and pads .123 to six digits."""
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


Instant = Annotated[AwareDatetime, AfterValidator(_utc_millis), PlainSerializer(_iso_millis)]
NonEmpty = Annotated[str, Field(min_length=1)]


class Snapshot(BaseModel):
    """One moment of work, as captured and redacted by the VS Code extension.

    Every field name is one lowercase word. The same names are the HTTP JSON, the stored record,
    and the MCP output, so there is no casing to convert anywhere.

    `workspace` is an opaque identity that must be unique per workspace on this machine (the
    extension sends the workspace root URI, not the folder name). `file` is workspace-relative
    with '/' separators. `timestamp` must carry an offset; naive times are rejected because the
    identity bucket must be unambiguous. An empty `branch` means no branch.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    workspace: NonEmpty
    file: NonEmpty
    branch: str | None = None
    timestamp: Instant
    language: str = ""
    symbol: str | None = None
    signatures: tuple[str, ...] = ()
    commands: tuple[str, ...] = ()
    excerpt: str = ""

    @model_validator(mode="before")
    @classmethod
    def _drop_echoed_id(cls, data: Any) -> Any:
        """`id` is computed. Accept it back so a response body can be posted as-is."""
        return {k: v for k, v in data.items() if k != "id"} if isinstance(data, dict) else data

    @field_validator("branch")
    @classmethod
    def _one_spelling_for_no_branch(cls, value: str | None) -> str | None:
        return value or None

    @computed_field
    @property
    def id(self) -> str:
        """Identity: same workspace, file, and branch within one UTC-aligned 10-minute bucket.

        Derived from the snapshot's own timestamp, never the server's clock, so an offline queue
        replayed hours later lands on the same record.
        """
        bucket = (self.timestamp - _EPOCH) // BUCKET
        key = json.dumps([self.workspace, self.file, self.branch or "", bucket])
        return hashlib.sha256(key.encode()).hexdigest()[:32]


class DataDirInUse(Exception):
    """Another process already owns this data directory."""


class Store:
    """The only reader and writer of the data directory. One per process, one process per directory.

    A second process opening the same Chroma directory sees new rows in `get` but not in vector
    `query` (measured), so ownership is enforced by an OS lock rather than by convention.
    Opens the directory on construction and loads the embedding model, so a missing or broken
    model fails at startup, not on the first ingest. Raises DataDirInUse if another process
    holds the directory.
    """

    def __init__(self, data_dir: Path) -> None:
        data_dir.mkdir(parents=True, exist_ok=True)
        self._owner_lock = _acquire_owner_lock(data_dir / "owner.lock")
        self._write_lock = threading.Lock()
        self._client: chromadb.ClientAPI | None = None
        try:
            self._client = chromadb.PersistentClient(
                path=str(data_dir / "chroma"),
                settings=chromadb.Settings(anonymized_telemetry=False),
            )
            # embedding_function=None: vectors are computed here, before the write lock is taken.
            self._collection = self._client.get_or_create_collection(_COLLECTION, embedding_function=None)
            _embedder()(["warm"])
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        """Close Chroma, then release the directory. Safe to call twice."""
        if self._client is not None:
            self._client.close()
        self._owner_lock.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        self.close()

    def put(self, snapshot: Snapshot) -> str:
        """Store a snapshot and return its id. Newest timestamp wins within an id.

        Idempotent and order-independent: any arrival order of the same sends (live sends mixed
        with an offline replay) converges to the same stored record. Embedding errors propagate;
        nothing is stored with a substitute vector.
        """
        text = _search_text(snapshot)
        vector = _embedder()([text])
        with self._write_lock:
            existing = self._collection.get(ids=[snapshot.id], include=["metadatas"])["metadatas"]
            if existing and existing[0]["at_ms"] >= _millis(snapshot.timestamp):
                return snapshot.id
            self._collection.upsert(
                ids=[snapshot.id], embeddings=vector, documents=[text], metadatas=[_metadata(snapshot)]
            )
        return snapshot.id

    def get(self, snapshot_id: str) -> Snapshot | None:
        rows = self._collection.get(ids=[snapshot_id], include=["metadatas"])["metadatas"]
        return _snapshot(rows[0]) if rows else None

    def recent(self, limit: int, workspace: str | None = None) -> list[Snapshot]:
        """Newest first, optionally limited to one workspace.

        Chroma has no ORDER BY, and an unbounded get fails past ~32k rows ("too many SQL
        variables"). Query widening windows on the indexed `at_ms` key instead, so the rows read
        scale with recent activity, not with total history.
        """
        now_ms = _millis(datetime.now(UTC))
        for window in _RECENT_WINDOWS:
            since_ms = None if window is None else now_ms - window // timedelta(milliseconds=1)
            rows = self._collection.get(where=_where(workspace, since_ms), include=["metadatas"])["metadatas"]
            if len(rows) >= limit:  # a window holding `limit` rows holds every record newer than its edge
                break
        rows.sort(key=lambda row: row["at_ms"], reverse=True)
        return [_snapshot(row) for row in rows[:limit]]

    def search(self, query: str, limit: int, workspace: str | None = None) -> list[Snapshot]:
        """Most similar first, by the local MiniLM embedding of `_search_text`."""
        hits = self._collection.query(
            query_embeddings=_embedder()([query]),
            n_results=limit,
            where=_where(workspace),
            include=["metadatas"],
        )
        return [_snapshot(row) for row in hits["metadatas"][0]]


@cache
def _embedder() -> ONNXMiniLM_L6_V2:
    """One per process. chromadb's DefaultEmbeddingFunction builds a fresh model per call
    (measured ~260 ms per call vs ~26 ms held)."""
    return ONNXMiniLM_L6_V2()


def _acquire_owner_lock(path: Path) -> IO[str]:
    """Exclusive, non-blocking OS lock; the OS drops it when the process dies, so a crash leaves nothing stale."""
    handle = open(path, "a+")
    try:
        if sys.platform == "win32":
            import msvcrt

            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        raise DataDirInUse(path.parent) from None
    return handle


def _millis(instant: datetime) -> int:
    return (instant - _EPOCH) // timedelta(milliseconds=1)


def _metadata(snapshot: Snapshot) -> dict[str, str | int]:
    """The stored row. `record` is the source of truth; `workspace` and `at_ms` are filter keys
    projected from it in this one place and never written separately."""
    return {
        "record": snapshot.model_dump_json(exclude={"id"}),
        "workspace": snapshot.workspace,
        "at_ms": _millis(snapshot.timestamp),
    }


def _snapshot(row: Mapping[str, Any]) -> Snapshot:
    return Snapshot.model_validate_json(row["record"])


def _search_text(snapshot: Snapshot) -> str:
    """The embedded document. MiniLM reads only the first 256 tokens, so the dense signals go first."""
    return "\n".join(
        [snapshot.file, snapshot.branch or "", snapshot.symbol or "", *snapshot.signatures, *snapshot.commands, snapshot.excerpt]
    )


def _where(workspace: str | None, since_ms: int | None = None) -> dict[str, Any] | None:
    """Chroma filter for the given constraints: none -> None, one -> itself, both -> {"$and": [...]}."""
    clauses: list[dict[str, Any]] = []
    if workspace is not None:
        clauses.append({"workspace": workspace})
    if since_ms is not None:
        clauses.append({"at_ms": {"$gte": since_ms}})
    return {"$and": clauses} if len(clauses) > 1 else clauses[0] if clauses else None
