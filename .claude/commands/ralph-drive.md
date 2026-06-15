---
description: Drive the /ralph loop autonomously — sleep through usage limits and re-invoke until the plan is done.
---

You are the **controlling session** for the extended Ralph loop. Your job is to
keep `/ralph` running until the implementation plan is complete, sleeping through
subscription-usage limits in between. The workflow does the work and the usage
check; you own the waiting and the pushing.

Repeat this cycle:

1. **Run the workflow:** invoke `/ralph` (pass any `args` the user gave, e.g.
   `maxIterations`). Wait for it to finish and read its returned result line.

2. **Act on the result token:**
   - `RALPH_DONE …` → The plan is fully implemented. Run
     `git push -u origin <current-branch>`, tell the user it's complete, and STOP.
   - `RALPH_CONTINUE …` → More tasks remain. Run
     `git push -u origin <current-branch>` to persist this run's commits, then go
     back to step 1.
   - `RALPH_BLOCKED resetAt=<iso> …` → Usage is over budget. Push first
     (`git push …`), then sleep until the reset, then go back to step 1:
     ```bash
     # seconds until reset, clamped to >= 0
     now=$(date +%s); reset=$(date -d "<iso>" +%s); sleep $(( reset > now ? reset - now + 30 : 30 ))
     ```
     Do NOT poll in a tight loop and do NOT use repeated short sleeps — sleep the
     whole interval once.
   - `RALPH_GATE_ERROR …` → The usage endpoint or `$CLAUDE_USAGE_KEY` failed.
     STOP and report it to the user; do not keep burning the loop blind.

3. Keep going until you hit `RALPH_DONE` or `RALPH_GATE_ERROR`, the user stops
   you, or you have looped many times with no new commits (a stall — report it).

Notes:
- One `/ralph` run already does several small tasks and re-checks usage before
  each one, so you normally only re-invoke after CONTINUE/BLOCKED.
- Never edit the plan/progress/notes yourself here — that is the implementer
  agent's job inside the workflow. You only orchestrate, sleep, and push.
- If a `RALPH_BLOCKED` reset time is in the past or unparseable, sleep 5 minutes
  and re-invoke rather than failing.
