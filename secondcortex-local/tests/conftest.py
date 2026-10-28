import shutil
import socket
import tempfile
import time
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from secondcortex.app import create_app
from secondcortex.memory import BUCKET, Store


class FakeLlm:
    def __init__(self, reply: str = "You were adding jitter to retry_with_backoff [1].") -> None:
        self.reply = reply
        self.calls: list[tuple[str, str]] = []

    def __call__(self, system: str, user: str) -> str:
        self.calls.append((system, user))
        return self.reply


def bucket_time(minutes: float) -> str:
    """A time `minutes` into the 10-minute bucket that started an hour ago, so a test controls bucket membership."""
    now = datetime.now(UTC)
    start = now - (now - datetime(1970, 1, 1, tzinfo=UTC)) % BUCKET - timedelta(hours=1)
    return (start + timedelta(minutes=minutes)).isoformat()


def snap(**overrides: object) -> dict[str, object]:
    return {
        "workspace": "file:///c%3A/code/payments-api",
        "file": "src/retry.py",
        "branch": "fix/backoff",
        "timestamp": bucket_time(1),
        "language": "python",
        "symbol": "retry_with_backoff",
        "signatures": ["def retry_with_backoff(fn, attempts=3, base_delay=0.5)"],
        "commands": ["pytest tests/test_retry.py -k jitter"],
        "excerpt": "delay = base_delay * 2 ** attempt + random.uniform(0, base_delay)",
        **overrides,
    }


def ingest(client: TestClient, **overrides: object) -> str:
    response = client.post("/snapshots", json=snap(**overrides))
    assert response.status_code == 200, response.text
    return response.json()["id"]


def closed_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


@pytest.fixture
def data_dir() -> Iterator[Path]:
    """Not tmp_path: pytest's shared basetemp can be unreadable on a developer machine."""
    root = Path(tempfile.mkdtemp(prefix="secondcortex-test-"))
    yield root / "data"
    for _ in range(10):  # Windows keeps a killed process's files locked for a moment
        shutil.rmtree(root, ignore_errors=True)
        if not root.exists():
            break
        time.sleep(0.5)


@pytest.fixture
def store(data_dir: Path) -> Iterator[Store]:
    with Store(data_dir) as opened:
        yield opened


@pytest.fixture
def llm() -> FakeLlm:
    return FakeLlm()


@pytest.fixture
def client(store: Store, llm: FakeLlm) -> TestClient:
    return TestClient(create_app(store, llm), base_url="http://127.0.0.1", raise_server_exceptions=False)
