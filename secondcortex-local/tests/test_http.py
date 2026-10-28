"""The extension's contract, driven through HTTP against a real store and the real embedding model."""

from datetime import UTC, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from conftest import FakeLlm, at, snap
from secondcortex.app import create_app
from secondcortex.ask import LlmUnavailable
from secondcortex.memory import Store


def ingest(client: TestClient, **overrides: object) -> str:
    response = client.post("/snapshots", json=snap(**overrides))
    assert response.status_code == 200, response.text
    return response.json()["id"]


def timeline(client: TestClient, **params: object) -> list[dict]:
    response = client.get("/snapshots", params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_resending_a_snapshot_keeps_one_record(client: TestClient) -> None:
    assert ingest(client) == ingest(client)
    assert len(timeline(client)) == 1


def test_edits_in_one_bucket_converge_to_the_newest(client: TestClient) -> None:
    first = ingest(client, timestamp=at(1), excerpt="first draft")
    second = ingest(client, timestamp=at(4), excerpt="second draft")
    assert first == second
    assert [row["excerpt"] for row in timeline(client)] == ["second draft"]


def test_late_replay_of_an_older_snapshot_does_not_overwrite_newer_work(client: TestClient) -> None:
    ingest(client, timestamp=at(4), excerpt="second draft")
    ingest(client, timestamp=at(1), excerpt="first draft")
    assert [row["excerpt"] for row in timeline(client)] == ["second draft"]


def test_new_bucket_branch_file_or_workspace_starts_a_new_record(client: TestClient) -> None:
    base = ingest(client)
    others = {
        ingest(client, timestamp=at(11)),
        ingest(client, branch="other"),
        ingest(client, file="src/other.py"),
        ingest(client, workspace="file:///c%3A/code/other-repo"),
    }
    assert len(others | {base}) == 5
    assert client.get(f"/snapshots/{base}").json()["excerpt"] == snap()["excerpt"]


def test_same_instant_in_another_offset_is_the_same_record(client: TestClient) -> None:
    instant = datetime.fromisoformat(at(1))
    as_utc = instant.isoformat().replace("+00:00", "Z")
    as_ist = instant.astimezone(timezone(timedelta(hours=5, minutes=30))).isoformat()
    assert ingest(client, timestamp=as_utc) == ingest(client, timestamp=as_ist)
    assert len(timeline(client)) == 1


def test_empty_branch_and_missing_branch_are_the_same_record(client: TestClient) -> None:
    payload = snap(branch="")
    empty = client.post("/snapshots", json=payload).json()["id"]
    missing = client.post("/snapshots", json={k: v for k, v in payload.items() if k != "branch"}).json()["id"]
    assert empty == missing
    assert timeline(client)[0]["branch"] is None


def test_timeline_is_newest_first_and_filters_by_workspace(client: TestClient) -> None:
    ingest(client, workspace="ws-a", file="a.py", timestamp=at(1))
    ingest(client, workspace="ws-b", file="b.py", timestamp=at(5))
    ingest(client, workspace="ws-a", file="c.py", timestamp=at(9))
    assert [row["file"] for row in timeline(client)] == ["c.py", "b.py", "a.py"]
    assert [row["file"] for row in timeline(client, workspace="ws-a")] == ["c.py", "a.py"]
    assert [row["file"] for row in timeline(client, limit=1)] == ["c.py"]


def test_timeline_reaches_old_work_when_nothing_newer_exists(client: TestClient) -> None:
    long_ago = (datetime.now(UTC) - timedelta(days=400)).isoformat()
    ingest(client, file="old.py", timestamp=long_ago)
    ingest(client, file="new.py", timestamp=at(1))
    assert [row["file"] for row in timeline(client, limit=2)] == ["new.py", "old.py"]


def test_get_returns_the_snapshot_as_sent_and_404_for_unknown_ids(client: TestClient) -> None:
    sent = snap(timestamp="2026-10-28T15:34:00.123456+05:30")
    snapshot_id = client.post("/snapshots", json=sent).json()["id"]
    got = client.get(f"/snapshots/{snapshot_id}").json()
    assert got == {**sent, "timestamp": "2026-10-28T10:04:00.123Z", "id": snapshot_id}
    assert client.get("/snapshots/nope").status_code == 404


def test_a_returned_snapshot_can_be_posted_back(client: TestClient) -> None:
    snapshot_id = ingest(client)
    returned = client.get(f"/snapshots/{snapshot_id}").json()
    again = client.post("/snapshots", json=returned)
    assert again.status_code == 200 and again.json() == {"id": snapshot_id}


def test_search_finds_work_by_meaning(client: TestClient) -> None:
    ingest(client)
    ingest(
        client,
        workspace="file:///c%3A/code/marketing-site",
        file="styles/button.css",
        branch="main",
        language="css",
        symbol=None,
        signatures=[],
        commands=["npm run build:css"],
        excerpt=".btn { border-radius: 4px; background: #1a73e8; color: white; }",
    )
    hits = client.get("/search", params={"q": "exponential backoff with jitter"}).json()
    assert [hit["file"] for hit in hits] == ["src/retry.py", "styles/button.css"]
    scoped = client.get("/search", params={"q": "button styling", "workspace": snap()["workspace"]}).json()
    assert [hit["file"] for hit in scoped] == ["src/retry.py"]


@pytest.mark.parametrize(
    "body",
    [
        snap(timestamp="2026-10-28T10:04:00"),
        snap(nope=1),
        {
            "workspaceFolder": "payments-api",
            "activeFile": "src/retry.py",
            "languageId": "python",
            "shadowGraph": "def retry_with_backoff(...)",
            "timestamp": at(1),
        },
    ],
    ids=["naive-timestamp", "unknown-field", "old-camelcase-payload"],
)
def test_rejects_naive_timestamps_unknown_fields_and_the_old_camelcase_payload(client: TestClient, body: dict) -> None:
    assert client.post("/snapshots", json=body).status_code == 422
    assert timeline(client) == []


def test_ask_answers_from_searched_snapshots(client: TestClient, llm: FakeLlm) -> None:
    ingest(client)
    response = client.post("/ask", json={"question": "what was I doing on the retry logic?"})
    body = response.json()
    assert response.status_code == 200
    assert body["answer"] == llm.reply
    assert [source["file"] for source in body["sources"]] == ["src/retry.py"]
    (system, user), = llm.calls
    assert "what was I doing on the retry logic?" in user
    assert "src/retry.py" in user and snap()["excerpt"] in user
    assert datetime.now(UTC).strftime("%Y-%m-%d") in system


def test_ask_with_empty_memory_does_not_call_the_llm(client: TestClient, llm: FakeLlm) -> None:
    body = client.post("/ask", json={"question": "anything?"}).json()
    assert body["sources"] == []
    assert body["answer"]
    assert llm.calls == []


def test_ask_reports_an_unreachable_llm_as_502(store: Store) -> None:
    def unreachable(system: str, user: str) -> str:
        raise LlmUnavailable("http://localhost:11434/v1 (llama3): connection refused")

    client = TestClient(create_app(store, unreachable), base_url="http://127.0.0.1")
    ingest(client)
    response = client.post("/ask", json={"question": "retry?"})
    assert response.status_code == 502
    assert "localhost:11434" in response.json()["detail"]


def test_unexpected_errors_return_500_without_a_traceback(store: Store) -> None:
    def broken(system: str, user: str) -> str:
        raise RuntimeError("boom at line 12")

    client = TestClient(create_app(store, broken), base_url="http://127.0.0.1", raise_server_exceptions=False)
    ingest(client)
    response = client.post("/ask", json={"question": "retry?"})
    assert response.status_code == 500
    assert "Traceback" not in response.text and "boom" not in response.text


def test_requests_with_a_foreign_host_header_are_refused(client: TestClient) -> None:
    ingest(client)
    response = client.get("/snapshots", headers={"host": "attacker.example"})
    assert response.status_code == 400
    assert "src/retry.py" not in response.text


@pytest.mark.parametrize("path", ["/snapshots", "/search?q=retry"])
@pytest.mark.parametrize("limit", [0, 101])
def test_out_of_range_limit_is_rejected(client: TestClient, path: str, limit: int) -> None:
    separator = "&" if "?" in path else "?"
    assert client.get(f"{path}{separator}limit={limit}").status_code == 422
