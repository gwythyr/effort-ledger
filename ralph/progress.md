# Progress Ledger

Living task list for the Ralph loop. **This is the loop's working memory** — each
fresh agent reads it, does one small task, ticks it off, and adds whatever it
discovered. Keep it a lean checklist, newest context near the top of each section.

Conventions:
- `[ ]` open · `[~]` in progress · `[x]` done (with `YYYY-MM-DD`) · `[BLOCKED]` needs a decision
- Tasks must be small/medium: target **<= 10 lines** changed. Bigger? Decompose here first.
- One task per iteration. Record durable findings in `notes.md`, not here.

## Now / next (pick from the top)

- [ ] **M1:** Determine whether effort level is logged per session; document in `notes.md`.
- [ ] **M1:** Locate the session-log directory; document one example record's shape in `notes.md`.

## Backlog (mirrors implementation-plan.md milestones)

### M2 — Session-log reader
- [ ] Choose runtime (default Python 3) + create project skeleton.
- [ ] Parse one JSONL session into a typed record.
- [ ] Iterate a directory of sessions into a list of records.

### M3 — Structural complexity proxies
- [ ] Compute per-session proxies (turns, tool calls, reverts, diff size, tests).
- [ ] Combine proxies into a structural complexity score.

### M4 — Context reconstruction + LLM judge
- [ ] Reconstruct working context (references read, interruptions, standing instructions).
- [ ] Add LLM-as-judge pass; combine into a complexity tier.

### M5 — Evaluation set
- [ ] Create a tiny hand-labelled eval set.
- [ ] Add a check scoring the classifier against the eval set.

## Done
<!-- Completed tasks accumulate here with their date. -->
- [x] 2026-06-14 Bootstrapped the Ralph loop workflow + workspace files.
