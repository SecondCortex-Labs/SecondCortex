from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import UTC, datetime

from openai import OpenAI, OpenAIError
from pydantic import BaseModel

from secondcortex.memory import Snapshot, Store

Complete = Callable[[str, str], str]

SOURCES_PER_ANSWER = 8
_EXCERPT_CHARS = 1200
_EMPTY = "Nothing in memory matches this question yet."


class Answer(BaseModel):
    """`sources[n-1]` is the snapshot the answer cites as [n]."""

    answer: str
    sources: list[Snapshot]


class LlmUnavailable(Exception):
    pass


def openai_complete(base_url: str, model: str, api_key: str | None) -> Complete:
    # One retry, not the SDK's two: with a stopped local model each refused connect costs ~2 s on Windows.
    client = OpenAI(base_url=base_url, api_key=api_key or "unused", timeout=120, max_retries=1)

    def complete(system: str, user: str) -> str:
        try:
            reply = client.chat.completions.create(
                model=model,
                temperature=0.2,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
        except OpenAIError as error:
            raise LlmUnavailable(f"{base_url} ({model}): {error}") from error
        return reply.choices[0].message.content or ""

    return complete


def ask(question: str, store: Store, complete: Complete, workspace: str | None = None) -> Answer:
    sources = store.search(question, SOURCES_PER_ANSWER, workspace)
    if not sources:
        return Answer(answer=_EMPTY, sources=[])
    return Answer(answer=complete(_system(datetime.now(UTC)), _prompt(question, sources)), sources=sources)


def _system(now: datetime) -> str:
    return (
        f"You answer a developer's questions about their own past work. Today is {now:%Y-%m-%d} (UTC). "
        "Use only the numbered snapshots provided. Cite them as [n]. "
        "If they do not answer the question, say so plainly."
    )


def _prompt(question: str, sources: Sequence[Snapshot]) -> str:
    blocks = []
    for n, source in enumerate(sources, start=1):
        header = f"[{n}] {source.timestamp:%Y-%m-%d %H:%M} UTC  {source.file} on {source.branch or 'no branch'}  {source.symbol or ''}"
        blocks.append("\n".join([header, *source.signatures, *source.commands, source.excerpt[:_EXCERPT_CHARS]]))
    return "\n\n".join([*blocks, f"Question: {question}"])
