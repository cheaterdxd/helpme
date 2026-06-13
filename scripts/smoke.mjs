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
    HELPME_TODAY: "2026-06-08",
    HELPME_MOCK_AI: "true",
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
  assertOrchestrated(organize, "organize_inbox");
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
  assertOrchestrated(plan, "plan_day");
  assert(plan.proposal?.id, "Plan command should create proposal");
  assert(Array.isArray(plan.related_context?.blocks), "Plan command should include blocks");
  assert(Array.isArray(plan.related_context?.validation?.free_windows), "Plan command should include free-window validation");
  assert(Array.isArray(plan.related_context?.validation?.blocked_intervals), "Plan command should include blocked intervals");
  assert(plan.related_context.validation.conflict_count === 0, "Plan command should produce conflict-free blocks");
  assertNoPlanConflicts(plan.related_context.blocks, plan.related_context.validation.blocked_intervals);
  assert(plan.related_context?.ai?.provider === "ollama", "Plan command should include AI provider metadata");
  assert(plan.answer === "Tôi đã sắp xếp thời gian để bạn tập trung học AWS.", "Plan command should include LLM explanation");
  assert(plan.related_context.reason === "Không có quá tải.", "Plan command should include LLM overload resolution summary");

  const planConfirmed = await postJson(`/api/ai/proposals/${plan.proposal.id}/confirm`, {});
  assert(planConfirmed.ok === true, "Confirm plan proposal should return ok");
  assert(planConfirmed.result?.time_blocks === plan.related_context.blocks.length, "Confirm plan should write every proposed block");

  const review = await postJson("/api/ai/command", {
    message: "Evening review"
  });
  assert(review.intent === "daily_review", "Review command should return daily_review intent");
  assert(review.mode === "proposal", "Review command should return proposal mode");
  assertOrchestrated(review, "daily_review");
  assert(Array.isArray(review.proposal?.payload?.reschedule), "Review proposal should include reschedule items");
  assert(review.proposal.payload.reschedule.length > 0, "Review proposal should reschedule unfinished tasks");
  assert(review.proposal.payload.validation?.conflict_count === 0, "Review proposal should be conflict-free");
  assertNoReviewConflicts(review.proposal.payload.reschedule, review.proposal.payload.validation.day_plans);

  const reviewConfirmed = await postJson(`/api/ai/proposals/${review.proposal.id}/confirm`, {});
  assert(reviewConfirmed.ok === true, "Confirm review proposal should return ok");
  assert(
    reviewConfirmed.result?.rescheduled_tasks === review.proposal.payload.reschedule.length,
    "Confirm review should reschedule every proposed task"
  );

  const createConflict = await postJson("/api/ai/command", {
    message: "Nhac toi 20h hoc AWS 1h"
  });
  assert(createConflict.intent === "create_task", "Conflicting create command should return create_task intent");
  assertOrchestrated(createConflict, "create_task");
  assert(createConflict.proposal?.payload?.validation?.conflict_count > 0, "Conflicting create proposal should report conflicts");
  const conflictConfirm = await postJsonExpectFailure(`/api/ai/proposals/${createConflict.proposal.id}/confirm`, {});
  assert(conflictConfirm.status === 400, "Confirm conflicting create_task should be rejected");
  assert(/conflict/i.test(conflictConfirm.body?.error ?? ""), "Rejected create_task should explain conflict");

  const create = await postJson("/api/ai/command", {
    message: "Nhac toi ngay mai 8:30 hoc AWS 60 phut"
  });
  assert(create.intent === "create_task", "Create command should return create_task intent");
  assertOrchestrated(create, "create_task");
  assert(create.proposal?.id, "Create command should create proposal");
  assert(create.proposal.payload.validation?.conflict_count === 0, "Create proposal should validate clear scheduled slot");

  const confirmed = await postJson(`/api/ai/proposals/${create.proposal.id}/confirm`, {});
  assert(confirmed.ok === true, "Confirm proposal should return ok");
  assert(confirmed.result?.task_id, "Confirm create_task should return task_id");
  assert(confirmed.result.validation?.conflict_count === 0, "Confirmed create_task should include validation result");

  const rescheduleConflict = await postJson("/api/ai/command", {
    message: "move sang ngay mai 8:30h"
  });
  assert(rescheduleConflict.intent === "reschedule_task", "Conflicting reschedule should return reschedule_task intent");
  assertOrchestrated(rescheduleConflict, "reschedule_task");
  assert(rescheduleConflict.proposal?.payload?.validation?.conflict_count > 0, "Conflicting reschedule should report conflicts");
  const rescheduleConflictConfirm = await postJsonExpectFailure(`/api/ai/proposals/${rescheduleConflict.proposal.id}/confirm`, {});
  assert(rescheduleConflictConfirm.status === 400, "Confirm conflicting reschedule_task should be rejected");
  assert(/conflict/i.test(rescheduleConflictConfirm.body?.error ?? ""), "Rejected reschedule_task should explain conflict");

  const rescheduleClear = await postJson("/api/ai/command", {
    message: "move sang ngay mai 10h"
  });
  assert(rescheduleClear.intent === "reschedule_task", "Clear reschedule should return reschedule_task intent");
  assert(rescheduleClear.proposal?.payload?.validation?.conflict_count === 0, "Clear reschedule should validate empty slot");
  const rescheduleConfirmed = await postJson(`/api/ai/proposals/${rescheduleClear.proposal.id}/confirm`, {});
  assert(rescheduleConfirmed.ok === true, "Confirm clear reschedule should return ok");
  assert(rescheduleConfirmed.result?.validation?.conflict_count === 0, "Confirmed reschedule should include validation result");

  // Verify proposal rejection flow
  const createTemp = await postJson("/api/ai/command", {
    message: "Nhac toi ngay mai 8:30 hoc AWS 60 phut"
  });
  assert(createTemp.intent === "create_task", "Temp proposal should return create_task intent");
  assert(createTemp.proposal?.id, "Temp proposal should have id");

  const rejectedResponse = await postJson(`/api/ai/proposals/${createTemp.proposal.id}/reject`, {});
  assert(rejectedResponse.ok === true, "Rejecting proposal should return ok");
  assert(rejectedResponse.proposal?.status === "rejected", "Rejected proposal status should be rejected");

  const confirmRejected = await postJsonExpectFailure(`/api/ai/proposals/${createTemp.proposal.id}/confirm`, {});
  assert(confirmRejected.status === 400, "Confirming rejected proposal should return 400");
  assert(confirmRejected.body?.error?.includes("already rejected"), "Error should state proposal is already rejected");

  // Verify low-confidence/fallback behavior
  const fallbackCheck = await postJson("/api/ai/command", {
    message: "abcxyz"
  });
  assert(fallbackCheck.intent === "fallback", "Unclear message should return fallback intent");
  assert(fallbackCheck.mode === "answer", "Fallback should return answer mode");
  assert(fallbackCheck.answer.includes("Tôi không hiểu rõ"), "Fallback answer should contain clarification instruction");

  // Verify settings endpoints
  const settings = await getJson("/api/settings");
  assert(settings.display_name === "Tuan", "Default display_name should be Tuan");
  assert(settings.working_window_start === "20:00", "Default working_window_start should be 20:00");

  const updatedSettings = await postJson("/api/settings", {
    display_name: "Tuan Dev",
    timezone: "Asia/Ho_Chi_Minh",
    working_window_start: "19:00",
    working_window_end: "22:00",
    preferred_model: "qwen3:1.7b",
    model_timeout_ms: 4000,
    deep_mode: true
  });
  assert(updatedSettings.display_name === "Tuan Dev", "Updated display_name should be Tuan Dev");
  assert(updatedSettings.model_timeout_ms === 4000, "Updated model_timeout_ms should be 4000");

  const todayAfterSettings = await getJson("/api/today");
  assert(todayAfterSettings.greeting === "Good evening, Tuan Dev.", "Greeting should reflect updated display name");

  // Direct CRUD API checks
  console.log("Direct task CRUD checks...");
  const createdTaskRes = await postJson("/api/tasks", {
    title: "Direct created task clear slot",
    estimated_minutes: 30,
    scheduled_start: "2026-06-09T14:00:00+07:00",
    scheduled_end: "2026-06-09T14:30:00+07:00",
    priority: 80,
    status: "todo"
  });
  assert(createdTaskRes.ok === true, "Direct createTask should return ok");
  assert(createdTaskRes.task?.id, "Direct created task should have ID");
  const createdTaskId = createdTaskRes.task.id;

  const createdTaskConflictRes = await postJsonExpectFailure("/api/tasks", {
    title: "Direct created task conflicting slot",
    estimated_minutes: 30,
    scheduled_start: "2026-06-09T14:00:00+07:00",
    scheduled_end: "2026-06-09T14:30:00+07:00",
    priority: 80,
    status: "todo"
  });
  assert(createdTaskConflictRes.status === 400, "Direct createTask conflict should return 400");
  assert(/conflict/i.test(createdTaskConflictRes.body?.error || ""), "Direct createTask conflict should return conflict error");

  const updatedTaskRes = await requestJson(`/api/tasks/${createdTaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Direct updated task", estimated_minutes: 45 })
  });
  assert(updatedTaskRes.ok === true, "Direct updateTask should return ok");
  assert(updatedTaskRes.task?.title === "Direct updated task", "Direct updated task title should be updated");

  const updatedTaskConflictRes = await patchJsonExpectFailure(`/api/tasks/${createdTaskId}`, {
    scheduled_start: "2026-06-08T20:00:00+07:00",
    scheduled_end: "2026-06-08T21:00:00+07:00"
  });
  assert(updatedTaskConflictRes.status === 400, "Direct updateTask conflict should return 400");
  assert(/conflict/i.test(updatedTaskConflictRes.body?.error || ""), "Direct updateTask conflict should return conflict error");

  const deletedTaskRes = await requestJson(`/api/tasks/${createdTaskId}`, {
    method: "DELETE"
  });
  assert(deletedTaskRes.ok === true, "Direct deleteTask should return ok");
  assert(deletedTaskRes.status === "cancelled", "Deleted task status should be cancelled");

  // breakdown_task command checks
  console.log("AI task breakdown checks...");
  const breakdown = await postJson("/api/ai/command", {
    message: "chia nhỏ task học AWS"
  });
  assert(breakdown.intent === "breakdown_task", "Breakdown command should return breakdown_task intent");
  assert(breakdown.mode === "proposal", "Breakdown command should return proposal mode");
  assertOrchestrated(breakdown, "breakdown_task");
  assert(breakdown.proposal?.id, "Breakdown command should create proposal");
  assert(Array.isArray(breakdown.proposal.payload.subtasks), "Breakdown proposal should include subtasks");
  assert(breakdown.proposal.payload.subtasks.length > 0, "Breakdown proposal should include at least one subtask");

  const breakdownConfirmed = await postJson(`/api/ai/proposals/${breakdown.proposal.id}/confirm`, {});
  assert(breakdownConfirmed.ok === true, "Confirm breakdown proposal should return ok");
  assert(breakdownConfirmed.result?.created_subtasks_count === breakdown.proposal.payload.subtasks.length, "Confirm breakdown should create subtasks");

  // Reminder & Notification Engine checks
  console.log("Reminder & Notification Engine checks...");
  const reminders = await getJson("/api/reminders");
  assert(Array.isArray(reminders.due), "Reminders should include due collection");
  assert(Array.isArray(reminders.upcoming), "Reminders should include upcoming collection");

  // Verify auto-generated reminder for seeded task (task_helpme_ux is scheduled for 2026-06-08T20:15:00+07:00,
  // since HELPME_TODAY is 2026-06-08 and getCurrentIsoTime is 2026-06-08T22:00:00+07:00, it should be due!)
  assert(reminders.due.some(r => r.task_id === "task_helpme_ux"), "Should auto-generate due reminder for task_helpme_ux");

  // Direct reminder CRUD
  const createdReminderRes = await postJson("/api/reminders", {
    title: "Drink water",
    remind_at: "2026-06-08T21:00:00+07:00",
    status: "scheduled"
  });
  assert(createdReminderRes.ok === true, "Direct createReminder should return ok");
  assert(createdReminderRes.reminder?.id, "Direct created reminder should have ID");
  const reminderId = createdReminderRes.reminder.id;

  // Verify it is in due list (since T21:00 <= T22:00)
  const remindersAfterCreate = await getJson("/api/reminders");
  assert(remindersAfterCreate.due.some(r => r.id === reminderId), "Created reminder should be in due list");

  // Snooze reminder
  const snoozedRes = await postJson(`/api/reminders/${reminderId}/snooze`, { minutes: 15 });
  assert(snoozedRes.ok === true, "Snooze reminder should return ok");
  assert(snoozedRes.reminder?.status === "snoozed", "Snoozed reminder status should be 'snoozed'");
  // Since we use getCurrentIsoTime() = T22:00:00, snoozing it by 15 mins shifts it to T22:15:00+07:00.
  // This is > T22:00:00, so it should now be in upcoming list!
  const remindersAfterSnooze = await getJson("/api/reminders");
  assert(!remindersAfterSnooze.due.some(r => r.id === reminderId), "Snoozed reminder should not be in due list");
  assert(remindersAfterSnooze.upcoming.some(r => r.id === reminderId), "Snoozed reminder should be in upcoming list");

  // Complete reminder
  const completedRes = await postJson(`/api/reminders/${reminderId}/complete`, {});
  assert(completedRes.ok === true, "Complete reminder should return ok");
  assert(completedRes.reminder?.status === "completed", "Completed reminder status should be 'completed'");

  const remindersAfterComplete = await getJson("/api/reminders");
  assert(!remindersAfterComplete.due.some(r => r.id === reminderId), "Completed reminder should not be in due list");
  assert(!remindersAfterComplete.upcoming.some(r => r.id === reminderId), "Completed reminder should not be in upcoming list");

  // AI command reminder capture
  console.log("AI reminder capture checks...");
  const aiReminder = await postJson("/api/ai/command", {
    message: "nhắc tôi uống nước sau 15 phút"
  });
  assert(aiReminder.intent === "create_reminder", "Reminder command should return create_reminder intent");
  assert(aiReminder.mode === "proposal", "Reminder command should return proposal mode");
  assertOrchestrated(aiReminder, "create_reminder");
  assert(aiReminder.proposal?.id, "Reminder command should create proposal");
  assert(aiReminder.proposal.payload.title === "uống nước", "Reminder title should be 'uống nước'");

  const reminderConfirmed = await postJson(`/api/ai/proposals/${aiReminder.proposal.id}/confirm`, {});
  assert(reminderConfirmed.ok === true, "Confirm reminder proposal should return ok");
  assert(reminderConfirmed.result?.reminder_id, "Confirm reminder should return reminder_id");
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

async function postJsonExpectFailure(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();

  if (response.ok) {
    throw new Error(`POST ${path} should have failed but returned ${response.status}: ${text}`);
  }

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
}

async function patchJsonExpectFailure(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();

  if (response.ok) {
    throw new Error(`PATCH ${path} should have failed but returned ${response.status}: ${text}`);
  }

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null
  };
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

function assertOrchestrated(response, intentHint) {
  const orchestration = response.orchestration;
  assert(orchestration?.run_id?.startsWith("orchestrator_"), "AI command should include orchestrator run id");
  assert(orchestration.status === "ok", "AI command orchestration should finish ok");
  assert(orchestration.mode === "quick", "AI command orchestration should default to quick mode");
  assert(orchestration.intent_hint === intentHint, `AI command should infer ${intentHint} intent hint`);
  assert(orchestration.budget?.timeout_ms > 0, "AI command should include orchestration timeout budget");
  assert(orchestration.budget?.max_steps > 0, "AI command should include orchestration step budget");
  assert(Array.isArray(orchestration.lifecycle), "AI command should include orchestration lifecycle");

  for (const step of ["understand", "gather_context", "plan", "validate", "propose", "log"]) {
    assert(
      orchestration.lifecycle.some((entry) => entry.step === step && entry.status === "ok"),
      `AI command orchestration should include successful ${step} step`
    );
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

function assertNoReviewConflicts(items, dayPlans) {
  const blockedByDate = new Map(dayPlans.map((plan) => [plan.date, plan.blocked_intervals]));

  for (const item of items) {
    const blockedIntervals = blockedByDate.get(item.suggested_start.slice(0, 10)) ?? [];
    for (const busy of blockedIntervals) {
      assert(!intervalsOverlap(item.suggested_start, item.suggested_end, busy.start, busy.end), `Review item ${item.title} should not overlap ${busy.title}`);
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
      if (items[index].suggested_start.slice(0, 10) !== items[nextIndex].suggested_start.slice(0, 10)) continue;
      assert(
        !intervalsOverlap(items[index].suggested_start, items[index].suggested_end, items[nextIndex].suggested_start, items[nextIndex].suggested_end),
        "Review reschedule items should not overlap each other"
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
