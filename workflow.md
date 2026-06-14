# Workflow: from raw session to model × effort economics

> Implementation plan for the complexity-classifier pipeline described in
> `projectidea.md`. This file captures *how* the pieces fit together; the *why*
> lives in the project idea. Spec-only — no code yet.

The pipeline is built as a **workflow of small, single-purpose agents**. Each
stage hands a clean artifact to the next, and each LLM-backed stage is deliberately
under-powered (a cheap model with a tightly engineered prompt) and over-constrained
(as few tools as possible, ideally none). A separate, more capable **judge model**
is used *off the hot path* to tune and validate the prompts for every stage — never
to do the per-session work itself.

The guiding principle: do the cheap, deterministic preprocessing first, give the
model the smallest faithful slice of input it needs, and keep a higher-capability
judge loop around the outside to keep each cheap stage honest.

---

## Stage 1 — Session extractor

**Job.** Take a raw session log and isolate the unit that actually gets scored:
the prompt(s) and the working context the agent genuinely engaged with. Strip
everything that is noise for complexity estimation.

**Shape.** Shipped as something the user installs and calls directly over their own
local logs. Most of this stage is *deterministic preprocessing*, not an LLM call:

1. **Raw preprocessing (no LLM).** Remove thinking blocks, tool-call chatter, and
   other noise. Normalize and **minify** the session into a compact representation.
2. **Identification (cheap LLM, only if needed).** Hand the minified session to a
   cheap model with direct, narrow instructions whose sole job is to identify the
   prompt-related parts — the task and the material it pulled in — and isolate them.

Keep the LLM out of this stage entirely if deterministic rules are good enough; only
reach for the cheap call when structure alone can't reliably find the prompt. The
output is a **prepared prompt**: the reconstructed working set, ready to be scored,
carrying no raw-log noise.

---

## Stage 2 — Prompt (complexity) evaluator

**Job.** Take the prepared prompt from Stage 1 and return a **complexity estimate**.

**Shape.** Also a workflow. The evaluator agent runs with **very restricted tools —
ideally none**, at most read. It works *only* from what Stage 1 handed it, so the
score reflects exactly the reconstructed context and nothing it could go fetch on its
own. This isolation is the point: the input it scores is fixed and auditable.

Two parts:

- **The evaluator.** A cheap model driven by a carefully engineered "thought" prompt
  that walks it through identifying complexity correctly — the prompt-engineering
  work is what lets a cheap model produce a trustworthy score.
- **The evaluation loop.** A more capable model acts as **judge** over the evaluator's
  outputs, scoring them against the hand-labelled eval set and feeding back into
  prompt iteration until the cheap evaluator agrees with the judge often enough to
  trust. This is the validation loop `projectidea.md` insists on building *before*
  any reporting pipeline.

---

## Stage 3 — Aggregation & reporting

**Job.** Gather all per-session results, analyze them, and present clear explanations
and statistics to the user.

**Shape.** A prompt or tool that pulls together the extracted + scored sessions and
produces the economics: distributions (not point estimates) of cost per solved task,
tokens per turn, iterations to completion, and solve rate, broken down by
**model × effort × complexity tier**, with readable explanations of what the numbers
mean.

---

## The cross-cutting judge loop

Each of the three stages will most likely have an LLM somewhere inside it. For every
stage that does, a **high-capability judge model** is used to build and refine the
right prompt — a deliberate cycle of *propose prompt → run cheap model → judge against
ground truth → revise*. The expensive model buys correctness in the prompt; the cheap
model then runs the prompt at scale. The judge never replaces the cheap per-session
worker; it only keeps it calibrated.

---

## Open implementation questions

- Does Stage 1 actually need an LLM, or do deterministic rules suffice for finding the
  prompt in a minified session? Default to no LLM; add the cheap call only if needed.
- Exactly how restricted can the Stage 2 evaluator be — truly zero tools, or read-only?
- How do the three stages pass artifacts (file handoff, in-memory, intermediate store)?
- Where does the effort level come from per session (the blocking unknown from
  `projectidea.md`) — it must be attached to each record before Stage 3 can segment by it.
