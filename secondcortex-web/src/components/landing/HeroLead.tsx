"use client";

import { useState } from "react";
import { AGENT_VIEW } from "./content";
import s from "./landing.module.css";

const VIEWS = ["human", "agent"] as const;
type View = (typeof VIEWS)[number];

export default function HeroLead() {
  const [view, setView] = useState<View>("human");
  const [call, ...json] = AGENT_VIEW.split("\n");

  return (
    <div>
      <div className={s.toggle} role="group" aria-label="Who is reading">
        {VIEWS.map((option) => (
          <button
            key={option}
            type="button"
            className={s.toggleBtn}
            aria-pressed={view === option}
            onClick={() => setView(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className={s.leadStack}>
        <p className={s.heroLead} data-hidden={view !== "human"}>
          SecondCortex <strong>records what you open, run, and decide in VS Code</strong>, strips secrets on your
          machine, and <strong>turns it into memory any MCP agent can query</strong>. Ask why the retry limit dropped
          to 3 and get the branch, the commit, and the reason.
        </p>
        <pre className={s.agentView} data-hidden={view !== "agent"}>
          <b>{call}</b>
          {`\n${json.join("\n")}`}
        </pre>
      </div>
    </div>
  );
}
