"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MEMORIES, PRIMARY_CTA, SUGGESTIONS, type Memory, type MemoryId } from "./content";
import s from "./MemoryDemo.module.css";

type DemoState =
  | { status: "idle" }
  | { status: "invalid" }
  | { status: "searching"; query: string }
  | { status: "found"; id: MemoryId; query?: string }
  | { status: "miss"; query: string };

const SEARCH_MS = 600;

function match(query: string): Memory | undefined {
  const q = query.toLowerCase();
  return MEMORIES.find((memory) => memory.keywords.some((keyword) => q.includes(keyword)));
}

export default function MemoryDemo() {
  const [state, setState] = useState<DemoState>({ status: "idle" });
  const [query, setQuery] = useState("");
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const search = (raw: string) => {
    const q = raw.trim();
    window.clearTimeout(timer.current);
    if (!q) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "searching", query: q });
    timer.current = window.setTimeout(() => {
      const hit = match(q);
      setState(hit ? { status: "found", id: hit.id, query: q } : { status: "miss", query: q });
    }, SEARCH_MS);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    search(query);
  };

  const selected = state.status === "found" ? MEMORIES.find((memory) => memory.id === state.id) : undefined;

  return (
    <div className={s.demo}>
      <div className={s.list}>
        <div className={s.bar}>
          <span>memory / team namespace</span>
          <span className={s.live}>● {MEMORIES.length} snapshots</span>
        </div>
        <ul className={s.entries}>
          {MEMORIES.map((memory) => (
            <li key={memory.id}>
              <button
                type="button"
                className={s.entry}
                aria-pressed={selected?.id === memory.id}
                onClick={() => {
                  window.clearTimeout(timer.current);
                  setState({ status: "found", id: memory.id });
                }}
              >
                <span className={s.file}>{memory.file}</span>
                <span className={s.summary}>{memory.summary}</span>
                <span className={s.meta}>
                  <span>{memory.branch}</span>
                  <span>{memory.age}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.panel}>
        <form className={s.form} onSubmit={onSubmit} noValidate>
          <label htmlFor="memory-query" className={s.srOnly}>
            Ask a question about the sample codebase
          </label>
          <span className={s.prompt} aria-hidden="true">
            &gt;
          </span>
          <input
            id="memory-query"
            className={s.input}
            type="text"
            autoComplete="off"
            placeholder="why was the retry limit reduced"
            value={query}
            aria-invalid={state.status === "invalid"}
            aria-describedby={state.status === "invalid" ? "memory-query-error" : undefined}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className={s.submit}>
            Search
          </button>
        </form>
        {state.status === "invalid" && (
          <p id="memory-query-error" className={s.error}>
            Type a question first, or pick one below.
          </p>
        )}

        <div className={s.suggestions}>
          <span className={s.try}>Try</span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={s.chip}
              onClick={() => {
                setQuery(suggestion);
                search(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <div className={s.result} aria-live="polite" aria-busy={state.status === "searching"}>
          <Result state={state} memory={selected} />
        </div>
      </div>
    </div>
  );
}

function Result({ state, memory }: { state: DemoState; memory?: Memory }) {
  switch (state.status) {
    case "searching":
      return (
        <>
          <p className={s.resultLabel}>retriever · searching &quot;{state.query}&quot;</p>
          <div className={s.skeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      );
    case "found":
      return memory ? (
        <>
          <p className={s.resultLabel}>
            retriever · match · {memory.file} · {memory.branch} · {memory.age}
          </p>
          <p className={s.resultText}>{memory.detail}</p>
        </>
      ) : null;
    case "miss":
      return (
        <>
          <p className={s.resultLabel}>retriever · no match</p>
          <p className={s.resultText}>
            This demo holds five sample memories, and none of them answer &quot;{state.query}&quot;. Try a suggested
            question, or{" "}
            <a href={PRIMARY_CTA.href} target="_blank" rel="noreferrer">
              install the extension
            </a>{" "}
            to search your own history.
          </p>
        </>
      );
    default:
      return (
        <>
          <p className={s.resultLabel}>retriever · awaiting query</p>
          <p className={s.resultText}>
            Click a memory on the left or ask a question. Answers come from personal and team memory, with the
            evidence attached.
          </p>
        </>
      );
  }
}
