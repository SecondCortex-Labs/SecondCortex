"""The OpenAI adapter against a real local HTTP endpoint, so no mock stands in for the SDK."""

import json
import threading
import time
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from conftest import closed_port
from secondcortex.ask import LlmUnavailable, openai_complete


class ChatEndpoint(BaseHTTPRequestHandler):
    requests: list[tuple[dict[str, str], dict]] = []

    def do_POST(self) -> None:
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        self.requests.append((dict(self.headers), body))
        reply = {
            "id": "x", "object": "chat.completion", "created": 0, "model": body["model"],
            "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": "stub reply"}}],
        }  # fmt: skip
        payload = json.dumps(reply).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args: object) -> None:
        pass


@pytest.fixture
def endpoint() -> Iterator[str]:
    ChatEndpoint.requests = []
    server = HTTPServer(("127.0.0.1", 0), ChatEndpoint)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}/v1"
    server.shutdown()
    server.server_close()


def test_complete_sends_system_and_user_messages_to_the_configured_model(endpoint: str) -> None:
    reply = openai_complete(endpoint, "llama3", None)("be brief", "what changed?")
    (headers, body), = ChatEndpoint.requests
    assert reply == "stub reply"
    assert body["model"] == "llama3"
    assert body["messages"] == [{"role": "system", "content": "be brief"}, {"role": "user", "content": "what changed?"}]
    assert headers["Authorization"] == "Bearer unused"


def test_complete_sends_the_api_key_when_one_is_configured(endpoint: str) -> None:
    openai_complete(endpoint, "gpt-4o-mini", "sk-test")("s", "u")
    assert ChatEndpoint.requests[0][0]["Authorization"] == "Bearer sk-test"


def test_an_unreachable_endpoint_is_llm_unavailable_naming_it() -> None:
    base_url = f"http://127.0.0.1:{closed_port()}/v1"
    started = time.monotonic()
    with pytest.raises(LlmUnavailable, match="127.0.0.1"):
        openai_complete(base_url, "llama3", None)("s", "u")
    assert time.monotonic() - started < 30
