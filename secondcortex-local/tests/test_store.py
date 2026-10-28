import re
from pathlib import Path

import pytest

from conftest import snap
from secondcortex.memory import DataDirInUse, Snapshot, Store


def test_a_second_store_on_the_same_data_dir_is_refused(data_dir: Path) -> None:
    with Store(data_dir) as first:
        with pytest.raises(DataDirInUse):
            Store(data_dir)
        assert first.recent(1) == []
    Store(data_dir).close()


def test_memory_survives_a_restart(data_dir: Path) -> None:
    snapshot = Snapshot.model_validate(snap())
    with Store(data_dir) as first:
        first.put(snapshot)
    with Store(data_dir) as reopened:
        assert reopened.get(snapshot.id) == snapshot
        assert reopened.recent(5) == [snapshot]
        assert reopened.search("exponential backoff with jitter", 5) == [snapshot]


def test_embedding_failure_stores_nothing(store: Store, monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(texts: list[str]) -> None:
        raise RuntimeError("model missing")

    monkeypatch.setattr("secondcortex.memory._embedder", lambda: broken)
    with pytest.raises(RuntimeError, match="model missing"):
        store.put(Snapshot.model_validate(snap()))
    assert store.recent(5) == []


def test_wire_field_names_are_single_lowercase_words() -> None:
    names = [*Snapshot.model_fields, *Snapshot.model_computed_fields]
    assert names and all(re.fullmatch("[a-z]+", name) for name in names)
