import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import AsciiCortex from "@/components/landing/AsciiCortex";
import HeroLead from "@/components/landing/HeroLead";
import MemoryDemo from "@/components/landing/MemoryDemo";
import RevealOnScroll from "@/components/landing/RevealOnScroll";
import SiteFooter from "@/components/landing/SiteFooter";
import SiteNav from "@/components/landing/SiteNav";
import TaglineReveal from "@/components/landing/TaglineReveal";
import TeamCortexDialog from "@/components/landing/TeamCortexDialog";
import {
  AGENT_CLIENTS,
  DIFF_LINES,
  FAQ,
  FEATURES,
  PRIMARY_CTA,
  RISK_REVERSAL,
  STATS,
  STEPS,
  TAGLINE,
} from "@/components/landing/content";
import s from "@/components/landing/landing.module.css";

const TITLE = "SecondCortex · Memory for you and your AI coding agents";
const DESCRIPTION =
  "SecondCortex captures your VS Code context, strips secrets on your machine, and gives Claude Code, Cursor, and Copilot memory of why your code looks the way it does.";

export const metadata: Metadata = {
  metadataBase: new URL("https://secondcortex.tech"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "SecondCortex", type: "website" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const FAQ_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
}).replace(/</g, "\\u003c");

const FLOW = ["VS Code", "Firewall", "Memory", "MCP", "Your agent"];

const DITHER_RAMP = " .:-=+*#%@";

function dither(cols: number, rows: number) {
  const lines: string[] = [];
  for (let r = 0; r < rows; r += 1) {
    let line = "";
    for (let c = 0; c < cols; c += 1) {
      const noise = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
      const jitter = noise - Math.floor(noise) - 0.5;
      const wave = 0.15 * Math.sin(r * 0.55 + c * 0.12);
      const density = Math.max(0, Math.min(0.999, (c / cols) ** 1.4 + wave + jitter * 0.35));
      line += DITHER_RAMP[Math.floor(density * DITHER_RAMP.length)];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

const DITHER = dither(56, 22);

function SectionHead({ index, tag, title, lead }: { index: string; tag: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <div className={`${s.headGap} ${s.reveal}`}>
      <p className={s.tag}>
        <span className={s.tagIndex}>[{index}]</span>
        <span>{tag}</span>
        <span className={s.tagLine} aria-hidden="true" />
      </p>
      <h2 className={s.h2}>{title}</h2>
      {lead && <p className={s.lead}>{lead}</p>}
    </div>
  );
}

function InstallButton() {
  return (
    <a className={`${s.btn} ${s.btnPrimary}`} href={PRIMARY_CTA.href} target="_blank" rel="noreferrer">
      {PRIMARY_CTA.label} <span className={s.glyph}>↗</span>
    </a>
  );
}

export default function LandingPage() {
  return (
    <div className={s.page}>
      <a className={s.skip} href="#main">
        Skip to content
      </a>
      <SiteNav />

      <main id="main">
        <section id="top" className={s.hero}>
          <div className={`${s.container} ${s.heroGrid}`}>
            <div className={s.heroCopy}>
              <p className={s.label}>Memory for VS Code and MCP agents</p>
              <h1 className={s.h1}>
                <span>Neither you nor</span> <span>your AI agents</span> <span>will lose context</span>
              </h1>
              <HeroLead />
              <div className={s.ctaRow}>
                <InstallButton />
                <p className={s.label}>Top 55 of 10,000+ in Microsoft AI Unlocked · MIT licensed</p>
              </div>
            </div>
            <div className={s.heroVisual}>
              <AsciiCortex />
            </div>
          </div>
        </section>

        <div className={`${s.container} ${s.clientsWrap}`}>
          <p className={s.label}>Works with any MCP client</p>
          <ul className={`${s.cells} ${s.clients}`} role="list">
            {AGENT_CLIENTS.map((client) => (
              <li key={client} className={s.client}>
                {client}
              </li>
            ))}
          </ul>
        </div>

        <hr className={s.rule} />

        <section id="problem" className={s.section}>
          <div className={`${s.container} ${s.split}`}>
            <SectionHead
              index="01"
              tag="The problem"
              title="Your agents start every session from zero"
              lead="The reason behind a line of code lives in a closed tab, a cleared terminal, or a teammate on leave. So you paste context into chat again, and the agent still guesses."
            />
            <div className={`${s.cells} ${s.reveal}`}>
              <div className={s.panelBar}>
                <span>context.diff</span>
                <span>−3 +3</span>
              </div>
              <div className={s.diff} role="list" aria-label="Before and after SecondCortex">
                {DIFF_LINES.map((line) => (
                  <p key={line.text} role="listitem" className={s.diffLine} data-sign={line.sign}>
                    <span className={s.diffSign} aria-hidden="true">
                      {line.sign}
                    </span>
                    <span className={s.srOnly}>{line.sign === "-" ? "Before: " : "After: "}</span>
                    <span>{line.text}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className={s.rule} />

        <section id="features" className={s.section}>
          <div className={s.container}>
            <SectionHead
              index="02"
              tag="Features"
              title="What it remembers, and what you get back"
              lead="Five things SecondCortex does with the context it captures. All of them read from the same memory."
            />
            <div className={`${s.cells} ${s.features} ${s.reveal}`}>
              {FEATURES.map((feature) => (
                <article key={feature.id} className={`${s.feature} ${feature.wide ? s.featureWide : ""}`}>
                  <h3 className={s.featureTitle}>{feature.title}</h3>
                  <p className={s.featureBody}>{feature.body}</p>
                  <pre className={s.asciiCard} aria-hidden="true" tabIndex={-1}>
                    {feature.ascii}
                  </pre>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={s.section} aria-label="Why SecondCortex exists">
          <div className={s.container}>
            <TaglineReveal text={TAGLINE} />
          </div>
        </section>

        <hr className={s.rule} />

        <section id="how" className={s.section}>
          <div className={s.container}>
            <SectionHead
              index="03"
              tag="How it works"
              title="Three steps from keystroke to recall"
              lead="Capture and scrubbing run inside the extension, so secrets are gone before anything is stored."
            />
            <ol className={`${s.cells} ${s.steps} ${s.reveal}`}>
              {STEPS.map((step, i) => (
                <li key={step.title} className={s.step}>
                  <span className={s.label}>[{String(i + 1).padStart(2, "0")}]</span>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepBody}>{step.body}</p>
                  <span className={s.chip}>{step.file}</span>
                </li>
              ))}
            </ol>
            <div
              className={`${s.flow} ${s.reveal}`}
              role="img"
              aria-label="Data flow from VS Code through the firewall and memory to MCP and your agent"
            >
              {FLOW.map((node, i) => (
                <Fragment key={node}>
                  {i > 0 && <span className={s.flowLink} aria-hidden="true" />}
                  <span className={s.flowNode}>{node}</span>
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        <hr className={s.rule} />

        <section id="demo" className={s.section}>
          <div className={s.container}>
            <SectionHead
              index="04"
              tag="Live demo"
              title="Ask your second cortex"
              lead="This demo runs on five sample memories from a two person team. Click a memory or ask a question in plain English."
            />
            <div className={s.reveal}>
              <MemoryDemo />
            </div>
          </div>
        </section>

        <hr className={s.rule} />

        <section id="proof" className={s.section}>
          <div className={s.container}>
            <SectionHead index="05" tag="Proof" title="The numbers so far" />
            <ul className={`${s.cells} ${s.stats} ${s.reveal}`} role="list">
              {STATS.map((stat) => (
                <li key={stat.label} className={s.stat}>
                  <span className={s.statValue}>
                    {stat.value}
                    {stat.unit && <span className={s.statUnit}>{stat.unit}</span>}
                  </span>
                  <span className={s.statLabel}>{stat.label}</span>
                  <span className={`${s.label} ${s.statSource}`}>{stat.source}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr className={s.rule} />

        <section id="faq" className={s.section}>
          <div className={s.container}>
            <SectionHead index="06" tag="FAQ" title="Questions developers ask first" />
            <div className={`${s.cells} ${s.reveal}`}>
              {FAQ.map((item) => (
                <details key={item.q} className={s.faqItem}>
                  <summary>
                    <span>{item.q}</span>
                    <span className={s.faqIcon} aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className={s.faqAnswer}>
                    {item.a}
                    {item.link && (
                      <>
                        {" "}
                        <a href={item.link.href}>{item.link.label} →</a>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_SCHEMA }} />
          </div>
        </section>

        <section className={s.section} aria-labelledby="cta-title">
          <div className={s.container}>
            <div className={`${s.cells} ${s.cta} ${s.reveal}`}>
              <div className={s.ctaCopy}>
                <h2 id="cta-title" className={s.h2}>
                  Build with context. Ship with confidence.
                </h2>
                <p className={s.lead}>
                  Install the extension and SecondCortex starts building memory from your next session.
                </p>
                <InstallButton />
                <ul className={`${s.riskList} ${s.label}`}>
                  {RISK_REVERSAL.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <pre className={s.dither} aria-hidden="true">
                {DITHER}
              </pre>
            </div>
          </div>
        </section>
      </main>

      <hr className={s.rule} />
      <SiteFooter />
      <RevealOnScroll />
      <TeamCortexDialog />
    </div>
  );
}
