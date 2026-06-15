# Implementation Plan

This file is the **source of intent** for the Ralph loop (`/ralph`). Each loop
iteration reads it, picks the next small step, implements it, and records
progress in `progress.md`. Edit this file to change *what* gets built; the loop
adapts on its next run.

> Scope discipline (from `projectidea.md`): the first deliverable is **not** a
> platform. It is a single analysis script over local session logs **plus** a
> small hand-labelled eval set that validates the complexity classifier. Build
> the classifier and its eval set **before** any reporting pipeline.

## Goal of this plan

Ship the validated **complexity classifier** MVP:

1. A script that parses local agent session logs (JSONL) into per-session records.
2. Honest complexity scoring: structural proxies + an LLM-as-judge pass over the
   *reconstructed* working context (prompt + referenced files + interruptions +
   standing instructions), not just the first message.
3. A tiny hand-labelled evaluation set, and a check that scores the classifier
   against it.

## Milestones (decompose into <=10-line tasks in progress.md)

### M1 — Resolve the blocking unknown
- [ ] Determine whether **effort level** is recorded per session in the local
      logs. This decides the whole architecture (see `projectidea.md` risks).
      Document the finding in `notes.md`.
- [ ] Locate the session-log directory and document one example record's shape
      in `notes.md` (path, format, key fields: tokens, model, turns, tool calls).

### M2 — Session-log reader
- [ ] Choose language/runtime (default: Python 3) and create the project skeleton
      (one module + a way to run it). Record the choice in `notes.md`.
- [ ] Parse one JSONL session file into a typed record (tokens, model, turns,
      tool-call count, diff size, test outcomes where available).
- [ ] Iterate a directory of sessions into a list of records.

### M3 — Structural complexity proxies
- [ ] Compute proxies per session: turns, tool-call volume, reverts/re-solves,
      diff size, tests passed vs failed.
- [ ] Combine proxies into a single structural complexity score.

### M4 — Context reconstruction + LLM judge
- [ ] Reconstruct the working context: follow references the agent actually read
      (bounded by a cap), fold in interruptions and standing instructions.
- [ ] Add an LLM-as-judge pass (cheap model) that scores the reconstructed
      context; combine with the structural score into a complexity tier.

### M5 — Evaluation set
- [ ] Create a tiny hand-labelled eval set (a handful of sessions with a
      human-assigned complexity tier) in a stable format.
- [ ] Add a check that runs the classifier over the eval set and reports
      agreement (so a regression in the scorer is visible).

## Done definition

The plan is complete when M1–M5 are implemented, the classifier runs end-to-end
over local sessions, and the eval check passes (or its disagreements are
documented in `notes.md`). Reporting/aggregation are explicitly **out of scope**
for this plan.
