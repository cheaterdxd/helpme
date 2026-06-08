import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempDir = mkdtempSync(join(tmpdir(), "helpme-smoke-"));
const dbPath = join(tempDir, "helpme-smoke.sqlite");
const port = Number(process.env.SMOKE_PORT || "3107");
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    LOG_LEVEL: "error",
    HELPME_DB_PATH: dbPath,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"
  },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true
});

let stdout = "";
let stderr = "";
server.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  await waitForHealth();
  await runSmokeChecks();
  console.log("Smoke passed.");
} catch (error) {
  console.error("Smoke failed.");
  console.error(error instanceof Error ? error.message : error);
  if (stdout.trim()) console.error(`stdout:\n${stdout}`);
  if (stderr.trim()) console.error(`stderr:\n${stderr}`);
  process.exitCode = 1;
} finally {
  await stopServer();
  rmSync(tempDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}

async function runSmokeChecks() {
  const health = await getJson("/healthz");
  assert(health.ok === true, "healthz should be ok");
  assert(health.app === "helpme", "healthz should identify HelpMe");

  const now = await getJson("/api/now");
  assert(now.planner?.selected_task_id, "Now should include planner selected_task_id");
  assert(now.selection_tree?.goals?.length > 0, "Now should include selection tree");

  const today = await getJson("/api/today");
  assert(today.suggested_focus?.task_id, "Today should include suggested focus");
  assert(typeof today.suggested_focus.score_breakdown.user_priority === "number", "Today should include planner score breakdown");
  assert(today.planner?.mode === "rule-based", "Today planner should be rule-based for MVP");

  const tasks = await getJson("/api/tasks");
  assert(Array.isArray(tasks.inbox), "Tasks should include inbox collection");
  assert(Array.isArray(tasks.open), "Tasks should include open collection");

  const focusTaskId = today.suggested_focus.task_id;
  const startedFocus = await postJson(`/api/tasks/${focusTaskId}/focus/start`, {});
  assert(startedFocus.ok === true, "Start focus should return ok");
  assert(startedFocus.session?.status === "active", "Start focus should create active session");

  const todayWithFocus = await getJson("/api/today");
  assert(todayWithFocus.focus_session?.id === startedFocus.session.id, "Today should expose active focus session");

  const endedFocus = await postJson(`/api/focus-sessions/${startedFocus.session.id}/complete`, { complete_task: false });
  assert(endedFocus.ok === true, "Complete focus should return ok");
  assert(endedFocus.session?.status === "completed", "Complete focus should mark session completed");

  const complete = await postJson(`/api/tasks/${focusTaskId}/complete`, {});
  assert(complete.ok === true, "Complete task should return ok");
  const afterComplete = await getJson("/api/tasks");
  assert(afterComplete.done.some((task) => task.id === focusTaskId), "Completed task should move to done collection");

  const reopen = await postJson(`/api/tasks/${focusTaskId}/reopen`, {});
  assert(reopen.ok === true, "Reopen task should return ok");
  const afterReopen = await getJson("/api/tasks");
  assert(afterReopen.open.some((task) => task.id === focusTaskId), "Reopened task should move back to open collection");

  const deadlines = await getJson("/api/deadlines");
  assert(Array.isArray(deadlines.today), "Deadline radar should include today group");
  assert(Array.isArray(deadlines.this_week), "Deadline radar should include this_week group");

  const aiStatus = await getJson("/api/ai/status");
  assert(aiStatus.provider === "ollama", "AI status should report Ollama provider");
  assert(typeof aiStatus.ok === "boolean", "AI status should expose ok boolean");

  const habits = await getJson("/api/habits");
  const habit = habits.find((item) => item.id === "habit_study_aws") ?? habits[0];
  const habitLog = await postJson(`/api/habits/${habit.id}/log`, {});
  assert(habitLog.ok === true, "Log habit should return ok");
  const habitsAfterLog = await getJson("/api/habits");
  const updatedHabit = habitsAfterLog.find((item) => item.id === habit.id);
  assert(updatedHabit.logged_count >= habit.logged_count, "Logged habit count should not decrease");

  const organize = await postJson("/api/ai/command", {
    message: "Organize inbox"
  });
  assert(organize.intent === "organize_inbox", "Organize command should return organize_inbox intent");
  assert(organize.mode === "proposal", "Organize command should return proposal mode");
  assert(Array.isArray(organize.proposal?.payload?.actions), "Organize proposal should include actions");
  assert(organize.proposal.payload.actions.length > 0, "Organize proposal should include at least one action");
  assert(organize.proposal.payload.actions.some((action) => action.group === "learning"), "Organize proposal should classify learning tasks");

  const organizeConfirmed = await postJson(`/api/ai/proposals/${organize.proposal.id}/confirm`, {});
  assert(organizeConfirmed.ok === true, "Confirm organize proposal should return ok");
  assert(
    organizeConfirmed.result?.organized_tasks === organize.proposal.payload.actions.length,
    "Confirm organize proposal should apply every action"
  );
  const afterOrganize = await getJson("/api/tasks");
  assert(afterOrganize.inbox.length === 0, "Organize confirm should clear seeded inbox");
  assert(
    afterOrganize.open.some((task) => task.id === "task_inbox_aws_whitepaper" && task.project_title),
    "Organized inbox task should move into open work with project context"
  );

  const plan = await postJson("/api/ai/command", {
    message: "Hom nay toi ranh tu 20h den 23h, sap lich giup toi"
  });
  assert(plan.intent === "plan_day", "Plan command should return plan_day intent");
  assert(plan.mode === "proposal", "Plan command should return proposal mode");
  assert(plan.proposal?.id, "Plan command should create proposal");
  assert(Array.isArray(plan.related_context?.blocks), "Plan command should include blocks");
  assert(Array.isArray(plan.related_context?.validation?.free_windows), "Plan command should include free-window validation");
  assert(Array.isArray(plan.related_context?.validation?.blocked_intervals), "Plan command should include blocked intervals");
  assert(plan.related_context.validation.conflict_count === 0, "Plan command should produce conflict-free blocks");
  assertNoPlanConflicts(plan.related_context.blocks, plan.related_context.validation.blocked_intervals);
  assert(plan.related_context?.ai?.provider, "Plan command should include AI provider metadata");

  const planConfirmed = await postJson(`/api/ai/proposals/${plan.proposal.id}/confirm`, {});
  assert(planConfirmed.ok === true, "Confirm plan proposal should return ok");
  assert(planConfirmed.result?.time_blocks === plan.related_context.blocks.length, "Confirm plan should write every proposed block");

  const create = await postJson("/api/ai/command", {
    message: "Nhac toi ngay mai 8h hoc AWS 1h"
  });
  assert(create.intent === "create_task", "Create command should return create_task intent");
  assert(create.proposal?.id, "Create command should create proposal");

  const confirmed = await postJson(`/api/ai/proposals/${create.proposal.id}/confirm`, {});
  assert(confirmed.ok === true, "Confirm proposal should return ok");
  assert(confirmed.result?.task_id, "Confirm create_task should return task_id");
}

async function waitForHealth() {
  const deadline = Date.now() + 15000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const health = await getJson("/healthz", { timeoutMs: 1200 });
      if (health.ok) return;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }

  throw new Error(`Server did not become healthy: ${lastError?.message ?? "timeout"}`);
}

async function getJson(path, options = {}) {
  return requestJson(path, { method: "GET", ...options });
}

async function postJson(path, body) {
  return requestJson(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function requestJson(path, { timeoutMs = 6000, ...init }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${init.method ?? "GET"} ${path} returned ${response.status}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoPlanConflicts(blocks, blockedIntervals) {
  for (const block of blocks) {
    for (const busy of blockedIntervals) {
      assert(!intervalsOverlap(block.start_at, block.end_at, busy.start, busy.end), `Plan block ${block.title} should not overlap ${busy.title}`);
    }
  }

  for (let index = 0; index < blocks.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < blocks.length; nextIndex += 1) {
      assert(
        !intervalsOverlap(blocks[index].start_at, blocks[index].end_at, blocks[nextIndex].start_at, blocks[nextIndex].end_at),
        "Plan blocks should not overlap each other"
      );
    }
  }
}

function intervalsOverlap(startA, endA, startB, endB) {
  return Date.parse(startA) < Date.parse(endB) && Date.parse(startB) < Date.parse(endA);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function stopServer() {
  if (server.exitCode !== null || server.killed) {
    return Promise.resolve();
  }

  return new Promise((resolveStop) => {
    const timeout = setTimeout(resolveStop, 3000);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolveStop();
    });
    server.kill();
  });
}
