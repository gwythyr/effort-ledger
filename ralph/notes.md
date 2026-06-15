# Notes

Durable findings, decisions, assumptions, gotchas, and open questions for the
Ralph loop. `progress.md` is the *task list*; this is the *memory*. A fresh agent
runs each iteration with no recollection of the last — write down anything that
would save the next agent from re-deriving it.

Keep entries short. Append; don't rewrite history. Prefer dated bullets.

## Decisions
- 2026-06-14 — Loop delivered as a Claude Code **dynamic workflow**
  (`.claude/workflows/ralph.js`, invoked as `/ralph`) rather than a shell loop,
  per the user. The workflow runtime can't sleep for hours, so usage-limit waits
  happen in the **controlling session** via `/ralph-drive`; the workflow just
  returns the reset time.

## Findings
- 2026-06-14 — Subscription usage endpoint returns JSON:
  `five_hour:{utilization, resets_at}`, `seven_day:{utilization, resets_at}`,
  `extra_usage:{...}`, `fetched_at`. Utilization is a percent; `resets_at` is
  ISO-8601. Fetch with `curl -s "https://claude-usage.tasty-projects.workers.dev/?key=$CLAUDE_USAGE_KEY"`.
  The key is the `CLAUDE_USAGE_KEY` env var (never commit it).

## Open questions
- [ ] Is **effort level** recorded per session in the local logs? Blocking
      architecture decision (see implementation-plan.md M1).

## Assumptions
- Default implementation language is **Python 3** unless a task records otherwise.
