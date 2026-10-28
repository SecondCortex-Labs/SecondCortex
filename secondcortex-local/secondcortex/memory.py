from __future__ import annotations

import hashlib
import json
import sys
import threading
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from functools import cache
from pathlib import Path
from typing import IO, Annotated, Any, Self

import chromadb
from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
from pydantic import (
    AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field, PlainSerializer,
    computed_field, field_validator, model_validator,
)  # fmt: skip

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
    return value.astimezone(UTC).replace(microsecond=value.microsecond // 1000 * 1000)


def _iso_millis(value: datetime) -> str:
    """Pydantic's default drops the fraction at .000 and pads .123 to six digits."""
    return value.isoformat(timespec="milliseconds").replace("+00:00", "Z")


Instant = Annotated[AwareDatetime, AfterValidator(_utc_millis), PlainSerializer(_iso_millis)]
NonEmpty = Annotated[str, Field(min_length=1)]


class Snapshot(BaseModel):
    """`workspace` is an opaque identity unique per workspace on this machine (the root URI, not the
    folder name). `file` is workspace-relative with '/' separators.
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
        return {k: v for k, v in data.items() if k != "id"} if isinstance(data, dict) else data

    @field_validator("branch")
    @classmethod
    def _one_spelling_for_no_branch(cls, value: str | None) -> str | None:
        return value or None

    @computed_field
    @property
    def id(self) -> str:
        """Identity: same workspace, file, and branch within one UTC-aligned 10-minute bucket."""
        bucket = (self.timestamp - _EPOCH) // BUCKET
        key = json.dumps([self.workspace, self.file, self.branch or "", bucket])
        return hashlib.sha256(key.encode()).hexdigest()[:32]


class DataDirInUse(Exception):
    pass


class Store:
    """A second process on the same Chroma directory sees new rows in `get` but not in vector
    `query` (measured), so ownership is an OS lock, not a convention.
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
            self._collection = self._client.get_or_create_collection(_COLLECTION, embedding_function=None)
            _embedder()(["warm"])
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
        self._owner_lock.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    def put(self, snapshot: Snapshot) -> str:
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
        """Chroma has no ORDER BY, and an unbounded get fails past ~32k rows ("too many SQL
        variables").
        """
        now_ms = _millis(datetime.now(UTC))
        for window in _RECENT_WINDOWS:
            since_ms = None if window is None else now_ms - window // timedelta(milliseconds=1)
            rows = self._collection.get(where=_where(workspace, since_ms), include=["metadatas"])["metadatas"]
            if len(rows) >= limit:
                break
        rows.sort(key=lambda row: row["at_ms"], reverse=True)
        return [_snapshot(row) for row in rows[:limit]]

    def search(self, query: str, limit: int, workspace: str | None = None) -> list[Snapshot]:
        hits = self._collection.query(
            query_embeddings=_embedder()([query]),
            n_results=limit,
            where=_where(workspace),
            include=["metadatas"],
        )
        return [_snapshot(row) for row in hits["metadatas"][0]]


@cache
def _embedder() -> ONNXMiniLM_L6_V2:
    """chromadb's DefaultEmbeddingFunction builds a fresh model per call
    (measured ~260 ms per call vs ~26 ms held)."""
    return ONNXMiniLM_L6_V2()


def _acquire_owner_lock(path: Path) -> IO[str]:
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
    return {
        "record": snapshot.model_dump_json(exclude={"id"}),
        "workspace": snapshot.workspace,
        "at_ms": _millis(snapshot.timestamp),
    }


def _snapshot(row: Mapping[str, Any]) -> Snapshot:
    return Snapshot.model_validate_json(row["record"])


def _search_text(snapshot: Snapshot) -> str:
    """MiniLM reads only the first 256 tokens, so the dense signals go first."""
    return "\n".join(
        [snapshot.file, snapshot.branch or "", snapshot.symbol or "", *snapshot.signatures, *snapshot.commands, snapshot.excerpt]
    )


def _where(workspace: str | None, since_ms: int | None = None) -> dict[str, Any] | None:
    clauses: list[dict[str, Any]] = []
    if workspace is not None:
        clauses.append({"workspace": workspace})
    if since_ms is not None:
        clauses.append({"at_ms": {"$gte": since_ms}})
    return {"$and": clauses} if len(clauses) > 1 else clauses[0] if clauses else None
