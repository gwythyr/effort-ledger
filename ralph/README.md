# Ralph loop

An autonomous, usage-gated, self-evolving build loop for this project,
implemented as a Claude Code **dynamic workflow**. You point it at an
implementation plan and it grinds the plan down to done, one tiny task at a time,
pausing itself whenever subscription usage gets close to the limit.

## The pieces

| File | Role |
|---|---|
| `.claude/workflows/ralph.js` | The workflow (`/ralph`). One run = a short burst of usage-gated iterations. |
| `.claude/commands/ralph-drive.md` | The controlling driver (`/ralph-drive`). Sleeps through usage limits and re-invokes `/ralph` until done. |
| `ralph/implementation-plan.md` | **What to build.** Source of intent. You edit this. |
| `ralph/progress.md` | **Working memory.** Living task ledger the loop reads and updates every iteration. |
| `ralph/notes.md` | **Long-term memory.** Findings, decisions, gotchas, open questions. |

## How one iteration works

Each `/ralph` run loops up to `maxIterations` times. Per iteration:

1. **Usage gate** — a subagent fetches subscription usage. If the 5-hour *or*
   7-day window is at/above the threshold (default **90%**), the workflow stops
   and returns the reset time instead of working.
2. **One small task** — a *fresh* subagent reads the plan + progress + notes,
   picks the single most valuable next task (**≤ 10 lines changed**, decomposing
   anything bigger), implements it, updates `progress.md` and `notes.md`, and
   commits. State lives only in the files, so every agent is stateless and the
   whole thing is resumable.

The workflow returns one of: `RALPH_DONE`, `RALPH_CONTINUE`,
`RALPH_BLOCKED resetAt=…`, or `RALPH_GATE_ERROR`.

## Running it

**Hands-on (one burst):** run `/ralph`. Read the returned token, push the
commits, and re-run when you want more. Re-run after a `RALPH_BLOCKED` once its
reset time passes.

**Autonomous (drive to done):** run `/ralph-drive`. The controlling session
keeps invoking `/ralph`, pushing after each run, and — because the workflow
runtime can't sleep for hours — it does the `sleep` until each usage reset
itself, then resumes. It stops at `RALPH_DONE` (or `RALPH_GATE_ERROR`).

Override config via `args`, e.g. *"run /ralph with maxIterations 2"* or
*"run /ralph with usageThreshold 80"*. Tunable: `planFile`, `progressFile`,
`notesFile`, `usageThreshold`, `maxIterations`, `lineBudget`.

## Why this shape

- **Stateless agents + file-based memory** is what makes the loop self-evolving:
  agents add their own subtasks and findings, so the system refines its own plan.
- **The ≤10-line budget** keeps each step reviewable and cheap, and forces big
  work to be decomposed in `progress.md` rather than done in one risky leap.
- **Usage gating lives where it can actually wait.** The workflow can't sleep for
  hours and a run doesn't survive exiting Claude Code, so the long waits happen
  in the controlling session (`/ralph-drive`); the workflow only *reports* when
  to wait and until when.

## Caveats

- A single `/ralph` run is bounded (one session, runtime agent caps). Long builds
  span many runs — that's why state is in files and `/ralph-drive` re-invokes.
- The loop commits but does not push; `/ralph-drive` pushes after each run.
  Run it from the project's working branch.
- `$CLAUDE_USAGE_KEY` must be set (it is, in the web environment) or the gate
  returns `RALPH_GATE_ERROR`.
