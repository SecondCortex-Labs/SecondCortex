import tempfile
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from secondcortex.memory import BUCKET, Store


def at(minutes: float) -> str:
    """ISO time `minutes` after the start of a bucket that began over an hour ago, so tests never straddle a bucket edge by accident."""
    now = datetime.now(UTC)
    start = now - (now - datetime(1970, 1, 1, tzinfo=UTC)) % BUCKET - timedelta(hours=1)
    return (start + timedelta(minutes=minutes)).isoformat()


def snap(**overrides: object) -> dict[str, object]:
    """A wire payload as the extension sends it, with `overrides` applied."""
    return {
        "workspace": "file:///c%3A/code/payments-api",
        "file": "src/retry.py",
        "branch": "fix/backoff",
        "timestamp": at(1),
        "language": "python",
        "symbol": "retry_with_backoff",
        "signatures": ["def retry_with_backoff(fn, attempts=3, base_delay=0.5)"],
        "commands": ["pytest tests/test_retry.py -k jitter"],
        "excerpt": "delay = base_delay * 2 ** attempt + random.uniform(0, base_delay)",
        **overrides,
    }


@pytest.fixture
def data_dir() -> Iterator[Path]:
    """A fresh data directory per test. Not tmp_path: pytest's shared basetemp can be unreadable on a developer machine."""
    with tempfile.TemporaryDirectory(prefix="secondcortex-test-", ignore_cleanup_errors=True) as directory:
        yield Path(directory) / "data"


@pytest.fixture
def store(data_dir: Path) -> Iterator[Store]:
    with Store(data_dir) as opened:
        yield opened
