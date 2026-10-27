# Landing page redesign: ASCII, sharp edges, HydraDB style

Date: 2026-10-26
Branch: feat/frontend-only-revamp
Scope: `secondcortex-web/src/app/page.tsx` and new `src/components/landing/*` files.

## Direction

Reference: hydradb.com. Pure black canvas, hairline grid cells that share borders,
zero corner radius, Geist Pixel display headlines, Geist Mono uppercase labels,
dithered character fields, bordered FAQ rows.

Kept from SecondCortex: the monochrome palette (no orange accent, white is the
accent), the existing headline, the five sample memories in the query demo,
and the proof numbers already on the page.

Added for "ASCII styling": a static ASCII brain supplied by the founder, with the
surrounding background noise stripped (a rotating 3D version was unreadable), box drawing section rules, a diff block for the
problem section, ASCII cards inside feature cells, glyph arrows instead of an
icon set, and an ANSI Shadow wordmark in the footer.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| bg | `#000000` | page |
| raised | `#181818` | code panels |
| hover | `#1F1F1F` | hover fill, active nav item |
| line | `#272727` | hairlines |
| line strong | `#313131` | ghost button border |
| text | `#F0F0F0` | primary text, primary button fill |
| text 2 | `#9B9B9B` | secondary text |
| text 3 | `#7A7A7A` | mono labels (4.6:1 on black) |

Radius 0 everywhere. Spacing and type resolve to the skill tables. Motion uses
`cubic-bezier(0.22, 1, 0.36, 1)`.

Fonts: Geist (body), Geist Pixel Square (display headings), Geist Mono
(labels, code, ASCII). Three faces of one family. This bends the skill's one
typeface rule because the user asked for HydraDB's pixel and mono look.

All three load from the `geist` npm package, not Google Fonts. The Google
`latin` subset of Geist Mono has no box drawing, block, or arrow glyphs, so
`─ █ ╗ → ▶` fell back to a wider font and broke the ASCII wordmark and cards.
The package ships the full glyph set. `✓ ◆ ▸` are missing from both, so the
page uses `[ok]`, `+`, `●`, and `▶` instead.

## Layout

Type A, classic hero plus sections. The product is understandable from the
hero copy plus the interactive memory demo, and visitors arrive mostly from the
VS Code Marketplace, GitHub, and hackathon links, so they need a fast read, not
a long story.

## Outline

1. Floating nav: wordmark, Features, How it works, Demo, FAQ, Thesis, GitHub, Install.
2. Hero: eyebrow, headline, Human/Agent toggle over the lead, one CTA, ASCII brain.
3. Backed by strip: Claude for Startups, Microsoft for Startups, AWS Activate, Top 10 at Microsoft AI Unlocked.
4. `[01]` Problem to solution: diff block.
5. `[02]` Features: five cells in a hairline grid.
6. Tagline reveal: word by word on scroll.
7. `[03]` How it works: three steps with a dashed ASCII flow.
8. `[04]` Demo: the memory query demo, rebuilt as React state.
9. `[05]` Proof: five stat cells.
10. `[06]` FAQ: eight questions, native `details`.
11. Final CTA with risk reversal.
12. Footer with ASCII wordmark.

## Hero copy

- Eyebrow: `MEMORY FOR VS CODE AND MCP AGENTS`
- Headline: Neither you nor your AI agents will lose context
- Lead (Human): SecondCortex records what you open, run, and decide in VS Code,
  strips secrets on your machine, and turns it into memory any MCP agent can
  query. Ask why the retry limit dropped to 3 and get the branch, the commit,
  and the reason.
- Lead (Agent): the `search_memory` response for the same question, as JSON.
- CTA: Install free for VS Code
- Proof: the Backed by strip directly under the hero. The line under the CTA reads "Free and MIT licensed".

## Benefits

1. **Decision archaeology.** Hover any function to see the branches you tried, the approach you dropped, and the commit that settled it.
2. **Secrets never reach memory.** API keys, JWTs, bearer tokens, and private keys are stripped inside the extension before a snapshot is stored.
3. **Pick up last week's branch in one step.** Files, terminal, and git state come back after you approve the plan and a simulator checks for conflicts.
4. **Incident triage in 30 seconds.** A team timeline of edits, commits, deploys, and alerts replaces 40 minutes across three tools.
5. **Stop pasting context into chat.** Claude Code, Cursor, and Copilot call `search_memory` directly.

## How it works

1. **Capture.** The extension snapshots open files, terminal commands, git state, and diagnostics, debounced so you keep decisions, not keystrokes.
2. **Scrub and store.** The semantic firewall strips secrets locally, then clean snapshots are embedded into per user memory.
3. **Recall.** Ask in VS Code or from any MCP agent and get the decision with its evidence.

## FAQ

Eight questions, written in `content.ts`: what it captures, whether code or
secrets leave the machine, which agents can use it, how it differs from git
blame, whether it changes the workspace without asking, offline use, cost and
license, and team use (hosted team backend is offline, self hosting works).

## SEO and AEO

Index. Evergreen product page.

- Title: SecondCortex · Memory for you and your AI coding agents
- Description: SecondCortex captures your VS Code context, strips secrets on your
  machine, and gives Claude Code, Cursor, and Copilot memory of why your code
  looks the way it does.
- FAQ rendered as plain question and answer, plus FAQPage JSON-LD.

## Not done, on purpose

- No testimonials. Inventing quotes for a real product would be fabricated reviews.
- No privacy or terms links. Those pages do not exist and the copy is a legal call.
- No `og:image`. There is no asset yet.
- The AWS mark is hand drawn. Simple Icons dropped the AWS and Microsoft marks, so swap in the official AWS Activate badge when you have it. The Microsoft mark is the standard four square geometry, in one color.
