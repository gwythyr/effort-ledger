// Extended Ralph loop, as a Claude Code dynamic workflow.
//
// Each invocation of /ralph runs a short, usage-gated burst of iterations.
// Every iteration: (1) check subscription usage and bail if we are over
// budget, (2) run ONE fresh agent that does a single small task toward the
// implementation plan. State lives entirely in the markdown files below, so
// each agent is stateless and the run is fully resumable by re-invoking /ralph.
//
// The workflow runtime itself has no shell/network and cannot sleep for hours,
// so when usage is over budget it does NOT wait. It returns the reset time and
// the *controlling session* (see .claude/commands/ralph-drive.md) sleeps until
// then and re-invokes /ralph.

export const meta = {
  name: 'ralph',
  description: 'Usage-gated Ralph loop: one small task per iteration toward ralph/implementation-plan.md.',
  phases: [
    { title: 'Usage gate' },
    { title: 'Implement one small task' },
  ],
}

// ---- Config (override any field by passing `args` to /ralph) ----
const cfg = {
  planFile: 'ralph/implementation-plan.md',
  progressFile: 'ralph/progress.md',
  notesFile: 'ralph/notes.md',
  usageThreshold: 90,   // percent; pause when 5h OR 7d window is at/above this
  maxIterations: 4,     // tasks per /ralph run; keeps a single run bounded
  lineBudget: 10,       // max lines touched per task
  ...(typeof args === 'object' && args ? args : {}),
}

// Pull the last `GATE_RESULT {json}` line an agent emitted.
function parseGate(text) {
  const matches = [...String(text).matchAll(/GATE_RESULT\s*(\{.*\})/g)]
  if (matches.length === 0) return null
  try { return JSON.parse(matches[matches.length - 1][1]) } catch { return null }
}

const gatePrompt = `You are the USAGE GATE for an autonomous loop. Do this and ONLY this — touch no files:

1. Run: curl -s "https://claude-usage.tasty-projects.workers.dev/?key=$CLAUDE_USAGE_KEY"
2. From the JSON, read five_hour.utilization + five_hour.resets_at and seven_day.utilization + seven_day.resets_at.
3. Let util = the LARGER of the two utilizations; window/resetAt = that window's name and its resets_at.
4. blocked = (util >= ${cfg.usageThreshold}).
5. As your VERY LAST line, output exactly one compact JSON object, prefixed with GATE_RESULT and nothing after it:
GATE_RESULT {"blocked":<true|false>,"util":<number>,"window":"<five_hour|seven_day>","resetAt":"<iso8601>","fiveUtil":<number>,"sevenUtil":<number>}
If you CANNOT read the utilizations — curl fails, the key is missing, or the JSON has no numeric utilization (e.g. it is an {"error": ...} object) — do NOT guess a number. Instead output only:
GATE_RESULT {"error":"<short reason>"}
A missing/null utilization is an endpoint failure, NOT a 0% and NOT a 100%: report it as an error.`

const implementPrompt = `You are ONE iteration of an autonomous "Ralph" loop building this project. A FRESH agent runs every iteration, so the files below are your only memory: read them first, leave them better than you found them. Repo root is the current directory.

Working files:
- Goal / spec:     ${cfg.planFile}
- Progress ledger: ${cfg.progressFile}
- Findings/notes:  ${cfg.notesFile}

Do EXACTLY ONE small step, then stop:

1. READ ${cfg.planFile}, ${cfg.progressFile} and ${cfg.notesFile} in full, and skim CLAUDE.md for project rules.
2. CHOOSE the single most valuable next task from ${cfg.progressFile} (or, if none is open, the next unstarted item in ${cfg.planFile}). It MUST be small or at most medium: target <= ${cfg.lineBudget} lines changed across the whole repo. If the obvious next task is bigger, DECOMPOSE it instead: add its subtasks to ${cfg.progressFile} and do only the first <= ${cfg.lineBudget}-line subtask.
3. IMPLEMENT just that task within the line budget. No unrelated refactors, no "while I'm here" extras.
4. UPDATE ${cfg.progressFile}: mark the task done with today's date (run \`date +%F\`) and add any new tasks/subtasks/follow-ups you discovered. Keep it a lean checklist.
5. APPEND to ${cfg.notesFile} any durable finding, decision, assumption, gotcha, or open question a future agent should know (1-2 bullets). Skip only if there is genuinely nothing.
6. COMMIT on the current branch: \`git add -A && git commit -m "ralph: <concise summary>"\`. Do NOT push.
7. As your FINAL line, report exactly one of:
   - RALPH_PLAN_COMPLETE  — only if, after your change, every item in ${cfg.planFile} is fully implemented and ${cfg.progressFile} has no open tasks.
   - RALPH_TASK_DONE: <one-line summary of what you did>

If you are BLOCKED (ambiguous spec, missing dependency, decision needed): do not guess. Record it as an open question in ${cfg.notesFile} and a [BLOCKED] item in ${cfg.progressFile}, commit that, and report RALPH_TASK_DONE: recorded blocker.`

// ---- Loop ----
let completed = 0
for (let i = 1; i <= cfg.maxIterations; i++) {
  phase('Usage gate')
  const gateOut = await agent(gatePrompt, { label: `gate-${i}` })
  const gate = parseGate(gateOut)

  if (!gate || gate.error) {
    const why = gate?.error ? gate.error : `unparseable gate output: ${String(gateOut).slice(-200)}`
    return `RALPH_GATE_ERROR — could not read usage after ${completed} task(s) this run (${why}). This is an endpoint/key problem, not a quota pause: check $CLAUDE_USAGE_KEY and the usage endpoint, then re-run /ralph.`
  }
  if (gate.blocked) {
    return `RALPH_BLOCKED resetAt=${gate.resetAt} window=${gate.window} util=${gate.util} (completed ${completed} task(s) this run). Sleep until resetAt, then re-run /ralph.`
  }

  phase('Implement one small task')
  const out = await agent(implementPrompt, { label: `task-${i}` })
  completed++

  if (/RALPH_PLAN_COMPLETE/.test(out)) {
    return `RALPH_DONE — implementation plan fully implemented (completed ${completed} task(s) this run).`
  }
}

return `RALPH_CONTINUE — completed ${completed} task(s) this run, more remain. Re-run /ralph.`
