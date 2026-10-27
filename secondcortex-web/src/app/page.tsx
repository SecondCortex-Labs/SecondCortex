import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import HeroLead from "@/components/landing/HeroLead";
import MemoryDemo from "@/components/landing/MemoryDemo";
import RevealOnScroll from "@/components/landing/RevealOnScroll";
import SiteFooter from "@/components/landing/SiteFooter";
import SiteNav from "@/components/landing/SiteNav";
import TaglineReveal from "@/components/landing/TaglineReveal";
import TeamCortexDialog from "@/components/landing/TeamCortexDialog";
import {
  AGENT_CLIENTS,
  BRAIN,
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

const DITHER_RAMP = " .:+#";
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// Ordered dither of a gradient that is densest in the bottom right corner.
function dither(cols: number, rows: number) {
  const lines: string[] = [];
  for (let r = 0; r < rows; r += 1) {
    let line = "";
    for (let c = 0; c < cols; c += 1) {
      const level = Math.max(0, 1.1 - Math.hypot(1 - c / cols, 1 - r / rows)) * (DITHER_RAMP.length - 1);
      const up = level % 1 > (BAYER[(r % 4) * 4 + (c % 4)] + 0.5) / 16 ? 1 : 0;
      line += DITHER_RAMP[Math.min(DITHER_RAMP.length - 1, Math.floor(level) + up)];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

const DITHER = dither(96, 40);

const BACKERS: ReadonlyArray<{ name: string; mark: ReactNode }> = [
  {
    name: "Claude for Startups",
    mark: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    ),
  },
  {
    name: "Microsoft for Startups",
    mark: (
      <svg viewBox="0 0 23 23" aria-hidden="true">
        <path d="M1 1h10v10H1zM12 1h10v10H12zM1 12h10v10H1zM12 12h10v10H12z" />
      </svg>
    ),
  },
  {
    name: "AWS Activate",
    // ponytail: hand drawn stand in for the AWS mark, swap in the official Activate badge SVG when available
    mark: (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <text x="32" y="22" textAnchor="middle" fontSize="24" fontWeight="700" letterSpacing="-1">
          aws
        </text>
        <path d="M10 28q22 12 44 0M47 25.5l8 2-4 6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

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
                <p className={s.label}>Free and MIT licensed</p>
              </div>
            </div>
            <figure className={s.heroVisual}>
              <pre className={s.brain} aria-hidden="true">
                {BRAIN}
              </pre>
            </figure>
          </div>
        </section>

        <div className={`${s.container} ${s.backedWrap}`}>
          <p className={s.label}>Backed by</p>
          <ul className={`${s.cells} ${s.backers}`} role="list">
            {BACKERS.map((backer) => (
              <li key={backer.name} className={s.backer}>
                <span className={s.backerMark}>{backer.mark}</span>
                {backer.name}
              </li>
            ))}
            <li className={s.backer}>
              <span className={s.backerTop}>Top 10</span>
              Microsoft AI Unlocked
            </li>
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
            <p className={`${s.label} ${s.worksWith}`}>Works with {AGENT_CLIENTS.join(" · ")}</p>
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
