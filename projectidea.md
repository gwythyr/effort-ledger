# Field Economics of AI Coding Models

> Working title — provisional. Alternatives to consider: *EffortLens*, *Session Economics*, *ModelPicker Telemetry*.

## One-line summary

A tool that mines real AI-assisted development sessions, automatically estimates the **complexity** of each task, and reports the **actual economics** — cost, token usage, and success rate — of running different models at different effort levels. The longer-term ambition is an aggregated, community-facing dataset (and site) that answers a question everyone has but almost nobody has measured: *which model and effort level is actually worth it, for which kind of task?*

This is a **reputational / long-term investment** project, not a revenue play. Success is measured in trust and citations, not MRR.

---

## The problem

Every developer using agentic coding tools faces the same recurring decision: which model (Haiku / Sonnet / Opus / Fable) and which effort level (low → max) to use for a given task. Pick too powerful, and you waste tokens and quota on work a cheaper model would have handled. Pick too weak, and you burn even more through failed attempts, re-prompts, and ballooning context across retries.

The decision is usually made with a crude two-line heuristic ("default to Sonnet, escalate to Opus when stuck"). That heuristic captures maybe 80% of the value at zero effort, which is exactly why most developers never feel the need for anything better. But it is a guess, not a measurement — and the data that *would* let you make an informed choice essentially does not exist in public:

- **Benchmark aggregators measure the wrong thing.** Public token-usage figures typically reflect a single effort level (usually max) on synthetic reasoning suites, not real agentic coding work.
- **Vendors don't publish the key numbers.** There is no official table of how token consumption scales across effort levels, nor field data on cost-per-*solved*-task by model.
- **The best public data point is `n=1`.** The most-cited real measurement of effort-level token scaling comes from a single hand-run prompt on one task — illustrative, but statistically meaningless.

So the genuinely missing artifact is not another cost tracker. It is **a statistically honest, field-derived picture of model × effort economics on real work**, segmented by task complexity.

---

## The idea

The tool does three things that, combined, do not exist anywhere today:

1. **Ingest real session data.** Read the local session logs that agentic coding tools already write to disk (token counts, models used, tool calls, turns, diffs, test outcomes).

2. **Estimate task complexity automatically — and honestly.** Classify each session along a complexity axis using observable proxies — number of turns, tool-call volume, re-solves and reverts, diff size, tests passed vs. failed — backed by a cheap LLM judge (e.g. Haiku). Crucially, the judge scores what the agent *actually engaged with* — the prompt **plus** the documents and files it pulled in, the interruptions, and the standing instructions — not merely the first message. (See *Measuring complexity honestly* below.)

3. **Report the economics.** Produce distributions — not point estimates — of *cost per solved task*, *tokens per turn*, *iterations to completion*, and *solve rate*, broken down by **model × effort level × complexity tier**. The unit that matters is the cost of a **successful** outcome, since failed attempts still consume tokens but deliver nothing.

The long-term extension is **aggregation**: a community dataset (and a simple public site) where many users' anonymized session metadata combine into population-level statistics, turning a personal dashboard into a shared reference.

---

## Positioning: what already exists vs. what's missing

The raw-telemetry layer is crowded and mature — do **not** rebuild it.

| Layer | State of the art | Build it? |
|---|---|---|
| Token / cost trackers per session | Saturated. Mature CLI and dashboard tools already parse local session logs, break cost down by model and billing window, and forecast burn rate. | **No** — build *on top of* their data format. |
| Commercial prompt routers | Exist for enterprise API routing, but route per-prompt at the API edge; they don't learn from your local coding sessions, don't reason about effort levels, and don't publish their economics. | **No** — different problem. |
| Automatic complexity estimation from session data | **Does not exist.** No tool classifies sessions by difficulty and maps "complexity → optimal model/effort." | **Yes.** |
| Field economics of model × effort | **Does not exist.** Public data is synthetic, single-effort, or `n=1`. | **Yes.** |
| Aggregated, crowdsourced model-economics dataset/site | **Does not exist.** | **Yes** (longer term). |

There is also a documented, unaddressed demand signal: a public feature request to *automatically select model and effort based on task complexity* exists in the official tooling's issue tracker — and has gone stale. The need was articulated by users; nobody shipped it.

---

## Architecture sketch

Deliberately minimal, layered on existing infrastructure rather than reinventing collection:

- **Data source.** Parse the JSONL session logs already written by the coding agent (and/or read an existing tracker's indexed store). First open question to resolve before committing to an architecture: **does the effort level get logged per session?** If yes, the whole pipeline is straightforward reads. If not, effort has to be captured another way (a session hook, status events, or a thin wrapper), which changes the design.
- **Complexity classifier.** A scoring function over structural proxies (turns, tool calls, reverts, diff size, test pass/fail) combined with an LLM-as-judge pass (e.g. Haiku) over the *reconstructed* working context — not just the opening message. This component is built and validated against a hand-labelled evaluation set **first**; see *Measuring complexity honestly* below for what the reconstruction involves and why it has to precede the pipeline.
- **Success heuristics.** Define "solved" from observable signals (tests passing, no subsequent revert, task closed) rather than self-report.
- **Statistics engine.** Output distributions (median, IQR, tail risk) per model × effort × complexity, not averages — the tails are where the real money and the real surprises live.
- **Reporting.** Start with a local report / dashboard. The aggregated public site is a later, optional layer with strict privacy constraints (metadata only — tokens, turns, model, effort, complexity score — never source code or prompt text).

---

## Measuring complexity honestly

This is what separates the project from a naïve token counter, and it is built **first** — before any reporting pipeline. A sloppy complexity classifier silently poisons every downstream number, so the opening deliverable is a small **evaluation set** of hand-labelled sessions plus a **tuned scoring prompt** validated against it. Pipeline second; a classifier taken on faith, never.

The naïve approach scores the **first user message** and stops there. That is actively misleading: a three-line prompt that references three design docs and points the agent at a large file is not a simple task — it only *looks* like one from the opening line. To score complexity honestly, the estimator reconstructs what the agent **actually engaged with**, not what the user happened to type first:

- **Follow the references.** When the prompt points to other documents, files, or earlier messages, resolve them and fold their content into the unit being scored — bounded to what the agent actually read (up to a sensible cap), not the entire repository.
- **Score the reconstructed context, not the opening line.** Complexity is judged on the real working set — the prompt *plus* the material it pulled in — because that is the only version that reflects the task the model genuinely faced.
- **Count interruptions.** A session the user stopped and re-steered four times is signalling difficulty or ambiguity that the token total alone will never reveal. Interruptions are a first-class complexity signal, not noise.
- **Factor in the standing instructions.** The persistent context — CLAUDE.md-style project instructions, system rules, tooling constraints — shapes how hard a task is and belongs *inside* the complexity estimate, not outside it.

The principle throughout: measure the task the agent *actually* worked on, so the economics that hang off the complexity label are honest rather than flattering. This is also the most defensible part of the project in public — it is the difference between a number people trust and a number people dismiss.

---

## Why this project (the reputational case)

The value here is not the tool's user count. The pain is widespread but the *tool* is niche — most developers are satisfied by the two-line heuristic. What is genuinely scarce, and widely consumed, is **trustworthy measurement**. A write-up of the form *"I analyzed N of my own real sessions; here is the actual cost-per-solved-task for Opus-high vs. Sonnet vs. Fable-medium, with full distributions"* answers a question the entire community has and nobody has rigorously measured.

The project also demonstrates a rare and reputation-building competence: it sits at the intersection of **field-data collection**, **statistical honesty**, and **backend engineering**. The most credible version follows a specific intellectual loop:

1. Publish a cost/effort **model** (a simulation with explicit, confidence-tagged assumptions).
2. **Collect real data** to test it.
3. Publish **where the model was wrong** — openly.

Very few people work this way in public, which is precisely why it compounds into reputation. (The pattern is well-proven: the most-cited "measurements" in this space are often a single careful experiment, honestly reported.)

---

## Validation strategy (do this before building anything large)

Invert the usual order. Don't build the tool and the site and then wait for demand. Instead, run a cheap two-week validation that produces a useful artifact either way:

1. **Collect data from your own existing sessions** (you already generate a lot — real backend projects, not toy tasks) with a simple script over the local logs. Even this MVP needs a small hand-labelled set to sanity-check the complexity scores — keep it tiny, but don't skip it, or the numbers are noise.
2. **Publish one analytical post** with real distributions, plus the script on GitHub.
3. **Link it** into the stale official feature request and the relevant communities.

The response *is* the demand measurement — one that no amount of searching can substitute for. If it lands, you already have an audience for the tool. If it doesn't, you spent two evenings and still walked away with a publication and your own data for picking models.

---

## Open questions and risks

- **Effort logging (blocking unknown).** Whether the effort level is recorded per session determines the architecture. Resolve first.
- **Platform risk.** Automatic effort/model selection is an obvious candidate for the vendor to build directly into the coding tool. A *product* would be threatened by this; a *reputational dataset* survives it — a vendor's built-in router keeps its statistics private, so an independent field dataset stays unique regardless.
- **Fast-moving target.** Models, effort dials, and pricing change frequently; any dataset needs a clear "as of" date and a re-collection cadence.
- **Aggregation privacy.** A crowdsourced site requires people to share session metadata derived from proprietary work. Conversion will be low without rigorous, transparent anonymization (metadata only, never code or prompts).
- **Self-selection bias.** Contributed data will skew toward power users; population claims must be hedged accordingly.

---

## Scope discipline

In keeping with a minimal-change philosophy: the first deliverable is **not** a platform. It is a single analysis script over your own sessions plus one honest write-up. Everything beyond that — multi-agent format support, a hosted dashboard, community aggregation — is a later layer, justified only if the validation step shows real appetite.
