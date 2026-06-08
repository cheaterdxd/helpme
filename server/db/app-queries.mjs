import { randomUUID } from "node:crypto";
import {
  ACTIVE_TASK_STATUSES,
  DONE_TASK_STATUSES,
  classifyDeadline,
  createPlannerDecision,
  getLocalDate,
  isSameDate,
  scoreDeadlinePressure
} from "../ai/planner.mjs";
import { sqlite } from "./client.mjs";

export function getTodayView() {
  const today = getTodayDate();
  const tasks = selectTasks();
  const deadlines = selectDeadlines();
  const timeBlocks = selectTimeBlocksForDate(today);
  const events = selectCalendarEventsForDate(today);
  const focusSession = selectActiveFocusSession();
  const plannedMinutes = sumMinutes(timeBlocks);
  const availableMinutes = availableMinutesForDate(today);
  const planner = createPlannerDecision({ tasks, deadlines, today, availableMinutes });
  const focus = planner.rankings[0] ?? null;
  const overload = buildOverloadSummary(plannedMinutes, availableMinutes, tasks);

  return {
    date: today,
    greeting: "Good evening, Tuan.",
    summary: {
      due_today: deadlines.filter((deadline) => classifyDeadline(deadline, today) === "today").length,
      overdue: deadlines.filter((deadline) => classifyDeadline(deadline, today) === "overdue").length,
      events_today: events.length,
      inbox_count: tasks.filter((task) => task.status === "inbox").length,
      open_tasks: tasks.filter((task) => ACTIVE_TASK_STATUSES.includes(task.status)).length,
      planned_minutes: plannedMinutes,
      available_minutes: availableMinutes
    },
    suggested_focus: focus
      ? {
          task_id: focus.id,
          title: focus.title,
          duration_minutes: focus.estimated_minutes ?? 30,
          score: focus.score,
          reason: focus.reason,
          score_breakdown: focus.score_breakdown,
          risk_summary: focus.risk_summary,
          fit_label: focus.fit_label,
          goal_title: focus.goal_title,
          project_title: focus.project_title
        }
      : null,
    focus_session: focusSession,
    planner: {
      mode: planner.mode,
      selected_task_id: planner.selected_task_id,
      reason_summary: planner.reason_summary,
      risk_summary: planner.risk_summary,
      alternatives: planner.alternatives
    },
    overload,
    timeline: [
      ...timeBlocks.map((block) => ({
        id: block.id,
        title: block.title,
        type: block.type,
        start: block.start_at,
        end: block.end_at,
        task_id: block.task_id,
        source: "daily_plan",
        status: block.status
      })),
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        type: "event",
        start: event.start_at,
        end: event.end_at,
        task_id: event.linked_task_id,
        source: event.source,
        status: "scheduled"
      }))
    ].sort((a, b) => a.start.localeCompare(b.start))
  };
}

export function getTaskCollections() {
  const tasks = selectTasks();
  const today = getTodayDate();

  return {
    inbox: tasks.filter((task) => task.status === "inbox"),
    today: tasks.filter((task) => isSameDate(task.scheduled_start, today) || isSameDate(task.due_at, today)),
    open: tasks.filter((task) => ACTIVE_TASK_STATUSES.includes(task.status) && task.status !== "inbox"),
    done: tasks.filter((task) => DONE_TASK_STATUSES.includes(task.status))
  };
}

export function getCalendarView() {
  const today = getTodayDate();

  return {
    mode: "day",
    date: today,
    events: selectCalendarEventsForDate(today),
    time_blocks: selectTimeBlocksForDate(today),
    free_windows: buildFreeWindows({
      date: today,
      availableStart: "20:00",
      availableEnd: "23:00",
      includeTimeBlocks: true
    })
  };
}

export function getDeadlineRadar() {
  const today = getTodayDate();
  const deadlines = selectDeadlines();
  const groups = {
    overdue: [],
    today: [],
    this_week: [],
    later: []
  };

  for (const deadline of deadlines) {
    groups[classifyDeadline(deadline, today)].push({
      ...deadline,
      urgency_score: scoreDeadlinePressure(deadline, today)
    });
  }

  return groups;
}

export function getHabitDashboard() {
  const habits = sqlite
    .prepare(
      `SELECT h.id, h.title, h.frequency, h.target_count, h.streak, h.status,
        COUNT(l.id) AS logged_count
       FROM habits h
       LEFT JOIN habit_logs l ON l.habit_id = h.id AND l.log_date >= date('now', '-6 days')
       WHERE h.status = 'active'
       GROUP BY h.id
       ORDER BY h.title ASC`
    )
    .all();

  return habits.map((habit) => ({
    id: habit.id,
    title: habit.title,
    frequency: habit.frequency,
    target_count: habit.target_count,
    streak: habit.streak,
    logged_count: habit.logged_count,
    completion_rate: Math.min(Math.round((habit.logged_count / Math.max(habit.target_count, 1)) * 100), 100),
    insight: buildHabitInsight(habit)
  }));
}

export function getGoalsOverview() {
  const goals = sqlite
    .prepare("SELECT id, title, description, status, priority, is_north_star FROM goals ORDER BY is_north_star DESC, priority DESC")
    .all();
  const projects = sqlite
    .prepare("SELECT id, goal_id, title, description, status, priority FROM projects ORDER BY priority DESC, created_at ASC")
    .all();
  const tasks = selectTasks();

  return goals.map((goal) => {
    const goalTasks = tasks.filter((task) => task.goal_id === goal.id);
    const completed = goalTasks.filter((task) => task.status === "done").length;

    return {
      ...goal,
      progress: goalTasks.length ? Math.round((completed / goalTasks.length) * 100) : 0,
      projects: projects
        .filter((project) => project.goal_id === goal.id)
        .map((project) => ({
          ...project,
          tasks: goalTasks.filter((task) => task.project_id === project.id)
        }))
    };
  });
}

export function getReviewSummary() {
  const today = getTodayDate();
  const tasks = selectTasks();
  const plannedToday = tasks.filter((task) => isSameDate(task.scheduled_start, today) || isSameDate(task.due_at, today));
  const completedToday = plannedToday.filter((task) => task.status === "done");
  const unfinishedToday = plannedToday.filter((task) => ACTIVE_TASK_STATUSES.includes(task.status));
  const habitInsights = getHabitDashboard().slice(0, 3);
  const reschedule = buildReviewReschedulePlan(unfinishedToday, today);

  return {
    date: today,
    prompt: "Evening review",
    completed: completedToday,
    unfinished: unfinishedToday,
    energy_check: {
      value: "unknown",
      label: "Ask at review time"
    },
    reschedule_suggestion: reschedule.items,
    reschedule_validation: reschedule.validation,
    habit_insights: habitInsights,
    summary: `Today has ${completedToday.length} completed task and ${unfinishedToday.length} unfinished planned task.`
  };
}

export function organizeInboxIntoProposal() {
  const inboxTasks = selectTasks().filter((task) => task.status === "inbox");
  const actions = buildInboxOrganizationActions(inboxTasks);
  const groups = groupInboxActions(actions);
  const proposal = createActionProposal({
    intent: "organize_inbox",
    title: "Organize inbox",
    summary: `Classify ${inboxTasks.length} inbox task${inboxTasks.length === 1 ? "" : "s"} into goals, projects, and priorities.`,
    payload: {
      actions,
      groups,
      task_ids: inboxTasks.map((task) => task.id)
    }
  });

  return { actions, groups, proposal };
}

export function createPlanDayProposal({ availableStart = "20:00", availableEnd = "23:00" } = {}) {
  const date = getTodayDate();
  const planId = getDailyPlanId(date);
  const freeWindows = buildFreeWindows({
    date,
    availableStart,
    availableEnd,
    replacePlanId: planId,
    includeTimeBlocks: true
  });
  const availableMinutes = sumMinutes(freeWindows);
  const tasks = rankOpenTasks(selectTasks(), selectDeadlines(), { today: date, availableMinutes }).filter((task) => task.status !== "inbox");
  const blocks = [];
  const windowCursors = freeWindows.map((window) => ({
    ...window,
    cursor_minutes: timeToMinutes(window.start.slice(11, 16)),
    end_minutes: timeToMinutes(window.end.slice(11, 16))
  }));

  for (const task of tasks) {
    const duration = Math.min(task.estimated_minutes ?? 30, 90);
    const window = windowCursors.find((item) => item.cursor_minutes + duration <= item.end_minutes);
    if (!window) continue;

    blocks.push({
      task_id: task.id,
      title: task.title,
      start_at: `${date}T${minutesToTime(window.cursor_minutes)}:00+07:00`,
      end_at: `${date}T${minutesToTime(window.cursor_minutes + duration)}:00+07:00`,
      type: "task"
    });
    window.cursor_minutes += duration;

    if (window.cursor_minutes + 10 <= window.end_minutes) {
      blocks.push({
        task_id: null,
        title: "Break",
        start_at: `${date}T${minutesToTime(window.cursor_minutes)}:00+07:00`,
        end_at: `${date}T${minutesToTime(window.cursor_minutes + 10)}:00+07:00`,
        type: "break"
      });
      window.cursor_minutes += 10;
    }
  }

  const validation = buildPlanValidation({
    date,
    availableStart,
    availableEnd,
    replacePlanId: planId,
    blocks,
    freeWindows,
    taskCount: tasks.length
  });

  const proposal = createActionProposal({
    intent: "plan_day",
    title: "Plan today",
    summary: `Create ${blocks.length} conflict-free time block${blocks.length === 1 ? "" : "s"} between ${availableStart} and ${availableEnd}.`,
    payload: {
      plan_date: date,
      available_start: availableStart,
      available_end: availableEnd,
      validation,
      blocks
    }
  });

  return { blocks, proposal, validation };
}

export function createTaskProposal({ title, dueAt = null, scheduledStart = null, estimatedMinutes = 30, priority = 50 }) {
  return createActionProposal({
    intent: "create_task",
    title: `Create task: ${title}`,
    summary: scheduledStart ? `Schedule "${title}" at ${formatDisplayTime(scheduledStart)}.` : `Add "${title}" to your task list.`,
    payload: {
      title,
      due_at: dueAt,
      scheduled_start: scheduledStart,
      estimated_minutes: estimatedMinutes,
      priority
    }
  });
}

export function createRescheduleProposal({ taskId, scheduledStart, estimatedMinutes = 30 }) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }

  return createActionProposal({
    intent: "reschedule_task",
    title: `Reschedule: ${task.title}`,
    summary: `Move "${task.title}" to ${formatDisplayTime(scheduledStart)}.`,
    payload: {
      task_id: taskId,
      scheduled_start: scheduledStart,
      scheduled_end: addMinutesIso(scheduledStart, estimatedMinutes),
      estimated_minutes: estimatedMinutes
    }
  });
}

export function createDailyReviewProposal() {
  const review = getReviewSummary();

  return createActionProposal({
    intent: "daily_review",
    title: "Apply evening review",
    summary: `Reschedule ${review.unfinished.length} unfinished task${review.unfinished.length === 1 ? "" : "s"} for tomorrow.`,
    payload: {
      reschedule: review.reschedule_suggestion,
      validation: review.reschedule_validation
    }
  });
}

export function confirmActionProposal(proposalId) {
  const proposal = sqlite.prepare("SELECT * FROM ai_action_proposals WHERE id = ?").get(proposalId);
  if (!proposal) {
    return { ok: false, error: "Proposal not found." };
  }

  if (proposal.status !== "pending") {
    return { ok: false, error: `Proposal is already ${proposal.status}.` };
  }

  const payload = JSON.parse(proposal.payload_json);
  let result;

  try {
    result = sqlite.transaction(() => {
      const applyResult = applyProposal(proposal.intent, payload);
      sqlite
        .prepare("UPDATE ai_action_proposals SET status = 'confirmed', confirmed_at = ? WHERE id = ?")
        .run(new Date().toISOString(), proposal.id);
      return applyResult;
    })();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Proposal validation failed." };
  }

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      intent: proposal.intent,
      title: proposal.title,
      summary: proposal.summary,
      status: "confirmed"
    },
    result
  };
}

export function createActionProposal({ intent, title, summary, payload }) {
  const id = `proposal_${randomUUID()}`;
  const createdAt = new Date().toISOString();

  sqlite
    .prepare(
      `INSERT INTO ai_action_proposals (id, intent, title, summary, payload_json, status, created_at, confirmed_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL)`
    )
    .run(id, intent, title, summary, JSON.stringify(payload), createdAt);

  return {
    id,
    intent,
    title,
    summary,
    payload,
    status: "pending",
    created_at: createdAt
  };
}

export function completeTask(taskId) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  if (task.status === "done") {
    return { ok: true, task_id: taskId, status: "done", unchanged: true };
  }

  sqlite.prepare("UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
  return { ok: true, task_id: taskId, status: "done" };
}

export function reopenTask(taskId) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  sqlite.prepare("UPDATE tasks SET status = 'todo', updated_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
  return { ok: true, task_id: taskId, status: "todo" };
}

export function startFocusSession(taskId, options = {}) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, status_code: 404, error: "Task not found." };
  }

  if (DONE_TASK_STATUSES.includes(task.status) || task.status === "cancelled") {
    return { ok: false, status_code: 400, error: "Task is not available for focus." };
  }

  const activeSession = selectActiveFocusSession();
  if (activeSession) {
    if (activeSession.task_id === taskId) {
      return { ok: true, session: activeSession, unchanged: true };
    }

    return { ok: false, status_code: 409, error: "A focus session is already active.", session: activeSession };
  }

  const now = new Date().toISOString();
  const sessionId = `focus_${randomUUID()}`;
  const durationMinutes = Math.max(Number(options.durationMinutes ?? task.estimated_minutes ?? 30), 5);

  sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO focus_sessions (
          id, task_id, title, start_at, end_at, duration_minutes, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, ?)`
      )
      .run(sessionId, taskId, task.title, now, durationMinutes, now, now);
    sqlite.prepare("UPDATE tasks SET status = 'in_focus', updated_at = ? WHERE id = ?").run(now, taskId);
  })();

  return { ok: true, session: selectFocusSession(sessionId) };
}

export function completeFocusSession(sessionId, options = {}) {
  const session = selectFocusSession(sessionId);
  if (!session) {
    return { ok: false, status_code: 404, error: "Focus session not found." };
  }

  if (session.status === "completed") {
    return { ok: true, session, unchanged: true };
  }

  const now = new Date().toISOString();
  const completeTask = options.completeTask === true;

  sqlite.transaction(() => {
    sqlite
      .prepare("UPDATE focus_sessions SET status = 'completed', end_at = COALESCE(end_at, ?), updated_at = ? WHERE id = ?")
      .run(now, now, sessionId);

    if (session.task_id && completeTask) {
      sqlite.prepare("UPDATE tasks SET status = 'done', updated_at = ? WHERE id = ?").run(now, session.task_id);
    } else if (session.task_id) {
      sqlite.prepare("UPDATE tasks SET status = 'todo', updated_at = ? WHERE id = ? AND status = 'in_focus'").run(now, session.task_id);
    }
  })();

  return { ok: true, session: selectFocusSession(sessionId) };
}

export function logHabitToday(habitId) {
  const habit = sqlite.prepare("SELECT id, title, streak FROM habits WHERE id = ? AND status = 'active'").get(habitId);
  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  const today = getTodayDate();
  const existing = sqlite.prepare("SELECT id FROM habit_logs WHERE habit_id = ? AND log_date = ? LIMIT 1").get(habitId, today);
  if (existing) {
    return { ok: true, habit_id: habitId, log_date: today, unchanged: true };
  }

  const now = new Date().toISOString();
  const logId = `habit_log_${randomUUID()}`;
  sqlite.transaction(() => {
    sqlite
      .prepare("INSERT INTO habit_logs (id, habit_id, log_date, value, note, created_at) VALUES (?, ?, ?, 1, ?, ?)")
      .run(logId, habitId, today, "Manual check-in", now);
    sqlite.prepare("UPDATE habits SET streak = streak + 1, updated_at = ? WHERE id = ?").run(now, habitId);
  })();

  return { ok: true, habit_id: habitId, log_id: logId, log_date: today };
}

export function rankOpenTasks(tasks = selectTasks(), deadlines = selectDeadlines(), options = {}) {
  return createPlannerDecision({
    tasks,
    deadlines,
    today: options.today ?? getTodayDate(),
    availableMinutes: options.availableMinutes ?? 90
  }).rankings;
}

function applyProposal(intent, payload) {
  if (intent === "create_task") {
    const id = `task_${randomUUID()}`;
    const now = new Date().toISOString();
    const defaultGoal = sqlite.prepare("SELECT id FROM goals ORDER BY is_north_star DESC, priority DESC LIMIT 1").get();

    sqlite
      .prepare(
        `INSERT INTO tasks (
          id, goal_id, project_id, parent_task_id, title, description, status, priority,
          estimated_minutes, due_at, scheduled_start, scheduled_end, fits_available_time,
          visible_in_now, created_at, updated_at
        ) VALUES (?, ?, NULL, NULL, ?, NULL, 'todo', ?, ?, ?, ?, ?, 1, 0, ?, ?)`
      )
      .run(
        id,
        defaultGoal?.id ?? "goal_helpme_ai_life_admin",
        payload.title,
        payload.priority ?? 50,
        payload.estimated_minutes ?? 30,
        payload.due_at ?? null,
        payload.scheduled_start ?? null,
        payload.scheduled_start ? addMinutesIso(payload.scheduled_start, payload.estimated_minutes ?? 30) : null,
        now,
        now
      );

    return { task_id: id };
  }

  if (intent === "reschedule_task") {
    sqlite
      .prepare("UPDATE tasks SET scheduled_start = ?, scheduled_end = ?, estimated_minutes = ?, updated_at = ? WHERE id = ?")
      .run(payload.scheduled_start, payload.scheduled_end, payload.estimated_minutes, new Date().toISOString(), payload.task_id);
    return { task_id: payload.task_id };
  }

  if (intent === "plan_day") {
    const now = new Date().toISOString();
    const planId = getDailyPlanId(payload.plan_date);
    const conflicts = findPlanConflicts(payload.plan_date, payload.blocks ?? [], planId);
    if (conflicts.length) {
      throw new Error(`Plan has ${conflicts.length} calendar conflict${conflicts.length === 1 ? "" : "s"}.`);
    }

    sqlite
      .prepare(
        `INSERT INTO daily_plans (id, plan_date, status, summary, created_at, updated_at)
         VALUES (?, ?, 'confirmed', ?, ?, ?)
         ON CONFLICT(plan_date) DO UPDATE SET status = 'confirmed', summary = excluded.summary, updated_at = excluded.updated_at`
      )
      .run(planId, payload.plan_date, "AI generated daily plan.", now, now);
    sqlite.prepare("DELETE FROM time_blocks WHERE daily_plan_id = ?").run(planId);

    for (const [index, block] of payload.blocks.entries()) {
      sqlite
        .prepare(
          `INSERT INTO time_blocks (
            id, daily_plan_id, task_id, title, start_at, end_at, type, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)`
        )
        .run(`time_block_${randomUUID()}_${index}`, planId, block.task_id, block.title, block.start_at, block.end_at, block.type, now, now);
    }

    return { plan_id: planId, time_blocks: payload.blocks.length };
  }

  if (intent === "organize_inbox") {
    const now = new Date().toISOString();
    const actions = Array.isArray(payload.actions) ? payload.actions.map(normalizeInboxAction).filter(Boolean) : [];

    if (actions.length) {
      for (const action of actions) {
        sqlite
          .prepare(
            `UPDATE tasks
             SET status = ?, goal_id = ?, project_id = ?, priority = ?, estimated_minutes = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(
            action.target_status,
            action.goal_id,
            action.project_id,
            action.priority,
            action.estimated_minutes,
            now,
            action.task_id
          );
      }

      return {
        organized_tasks: actions.length,
        groups: countBy(actions, "group"),
        updated_fields: ["status", "goal_id", "project_id", "priority", "estimated_minutes"]
      };
    }

    for (const taskId of payload.task_ids ?? []) {
      sqlite.prepare("UPDATE tasks SET status = 'todo', updated_at = ? WHERE id = ?").run(now, taskId);
    }

    return { organized_tasks: payload.task_ids?.length ?? 0 };
  }

  if (intent === "daily_review") {
    const normalizedItems = (payload.reschedule ?? []).map(normalizeReviewRescheduleItem).filter(Boolean);
    const conflicts = findRescheduleConflicts(normalizedItems);
    if (conflicts.length) {
      throw new Error(`Review reschedule has ${conflicts.length} calendar conflict${conflicts.length === 1 ? "" : "s"}.`);
    }

    for (const item of normalizedItems) {
      sqlite
        .prepare("UPDATE tasks SET scheduled_start = ?, scheduled_end = ?, updated_at = ? WHERE id = ?")
        .run(item.suggested_start, item.suggested_end, new Date().toISOString(), item.task_id);
    }

    return { rescheduled_tasks: normalizedItems.length, validation: payload.validation ?? null };
  }

  return { ignored: true };
}

function selectTasks() {
  return sqlite
    .prepare(
      `SELECT t.*, g.title AS goal_title, g.priority AS goal_priority, g.is_north_star, p.title AS project_title
       FROM tasks t
       LEFT JOIN goals g ON g.id = t.goal_id
       LEFT JOIN projects p ON p.id = t.project_id
       ORDER BY t.priority DESC, t.created_at ASC`
    )
    .all();
}

function selectDeadlines() {
  return sqlite
    .prepare(
      `SELECT d.*, t.title AS task_title, g.title AS goal_title
       FROM deadlines d
       LEFT JOIN tasks t ON t.id = d.task_id
       LEFT JOIN goals g ON g.id = d.goal_id
       WHERE d.status IN ('active', 'watched', 'open')
       ORDER BY d.due_at ASC`
    )
    .all();
}

function selectTimeBlocksForDate(date) {
  return sqlite
    .prepare(
      `SELECT tb.*, t.title AS task_title
       FROM time_blocks tb
       LEFT JOIN tasks t ON t.id = tb.task_id
       WHERE substr(tb.start_at, 1, 10) = ?
       ORDER BY tb.start_at ASC`
    )
    .all(date);
}

function selectCalendarEventsForDate(date) {
  return sqlite
    .prepare(
      `SELECT *
       FROM calendar_events
       WHERE substr(start_at, 1, 10) = ?
       ORDER BY start_at ASC`
    )
    .all(date);
}

function selectBlockingTimeBlocksForDate(date, replacePlanId = null) {
  const blocks = selectTimeBlocksForDate(date);
  if (!replacePlanId) return blocks;
  return blocks.filter((block) => block.daily_plan_id !== replacePlanId);
}

function selectActiveFocusSession() {
  return sqlite
    .prepare(
      `SELECT fs.*, t.title AS task_title, t.status AS task_status, g.title AS goal_title, p.title AS project_title
       FROM focus_sessions fs
       LEFT JOIN tasks t ON t.id = fs.task_id
       LEFT JOIN goals g ON g.id = t.goal_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE fs.status = 'active'
       ORDER BY fs.start_at DESC, fs.created_at DESC
       LIMIT 1`
    )
    .get() ?? null;
}

function selectFocusSession(sessionId) {
  return sqlite
    .prepare(
      `SELECT fs.*, t.title AS task_title, t.status AS task_status, g.title AS goal_title, p.title AS project_title
       FROM focus_sessions fs
       LEFT JOIN tasks t ON t.id = fs.task_id
       LEFT JOIN goals g ON g.id = t.goal_id
       LEFT JOIN projects p ON p.id = t.project_id
       WHERE fs.id = ?`
    )
    .get(sessionId) ?? null;
}

function buildFreeWindows({ date, availableStart, availableEnd, replacePlanId = null, includeTimeBlocks = true }) {
  const baseWindow = {
    id: "free_requested_window",
    start: `${date}T${availableStart}:00+07:00`,
    end: `${date}T${availableEnd}:00+07:00`,
    label: "Requested focus window"
  };
  const busyIntervals = selectBusyIntervalsForDate(date, { replacePlanId, includeTimeBlocks });
  const freeWindows = subtractBusyIntervals([baseWindow], busyIntervals);

  return freeWindows.map((window, index) => ({
    ...window,
    id: `free_${date.replaceAll("-", "_")}_${index + 1}`,
    label: index === 0 ? "Open focus window" : "Open gap",
    minutes: minutesBetween(window.start, window.end)
  }));
}

function selectBusyIntervalsForDate(date, { replacePlanId = null, includeTimeBlocks = true } = {}) {
  const events = selectCalendarEventsForDate(date).map((event) => ({
    id: event.id,
    title: event.title,
    type: "event",
    start: event.start_at,
    end: event.end_at,
    source: event.source
  }));
  const blocks = includeTimeBlocks
    ? selectBlockingTimeBlocksForDate(date, replacePlanId).map((block) => ({
        id: block.id,
        title: block.title,
        type: block.type,
        start: block.start_at,
        end: block.end_at,
        source: "time_block"
      }))
    : [];

  return [...events, ...blocks]
    .filter((item) => item.start && item.end && Date.parse(item.end) > Date.parse(item.start))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function subtractBusyIntervals(windows, busyIntervals) {
  let free = windows;

  for (const busy of busyIntervals) {
    free = free.flatMap((window) => subtractInterval(window, busy));
  }

  return free.filter((window) => minutesBetween(window.start, window.end) > 0);
}

function subtractInterval(window, busy) {
  if (!intervalsOverlap(window.start, window.end, busy.start, busy.end)) return [window];

  const next = [];
  if (Date.parse(busy.start) > Date.parse(window.start)) {
    next.push({ ...window, end: busy.start });
  }

  if (Date.parse(busy.end) < Date.parse(window.end)) {
    next.push({ ...window, start: busy.end });
  }

  return next;
}

function buildPlanValidation({ date, availableStart, availableEnd, replacePlanId, blocks, freeWindows, taskCount }) {
  const busyIntervals = selectBusyIntervalsForDate(date, { replacePlanId, includeTimeBlocks: true });
  const conflicts = findPlanConflicts(date, blocks, replacePlanId);

  return {
    policy: "avoid_calendar_events_and_locked_time_blocks",
    requested_window: {
      start: `${date}T${availableStart}:00+07:00`,
      end: `${date}T${availableEnd}:00+07:00`
    },
    free_windows: freeWindows,
    blocked_intervals: busyIntervals,
    conflict_count: conflicts.length,
    scheduled_blocks: blocks.length,
    scheduled_minutes: sumMinutes(blocks.map((block) => ({ start_at: block.start_at, end_at: block.end_at }))),
    considered_tasks: taskCount
  };
}

function findPlanConflicts(date, blocks, replacePlanId) {
  const busyIntervals = selectBusyIntervalsForDate(date, { replacePlanId, includeTimeBlocks: true });
  const conflicts = [];

  for (const block of blocks) {
    for (const busy of busyIntervals) {
      if (intervalsOverlap(block.start_at, block.end_at, busy.start, busy.end)) {
        conflicts.push({ block, busy });
      }
    }
  }

  for (let index = 0; index < blocks.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < blocks.length; nextIndex += 1) {
      if (intervalsOverlap(blocks[index].start_at, blocks[index].end_at, blocks[nextIndex].start_at, blocks[nextIndex].end_at)) {
        conflicts.push({ block: blocks[index], busy: blocks[nextIndex] });
      }
    }
  }

  return conflicts;
}

function buildReviewReschedulePlan(tasks, today) {
  const unscheduled = [...tasks].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const items = [];
  const dayPlans = [];

  for (let dayOffset = 1; dayOffset <= 7 && unscheduled.length; dayOffset += 1) {
    const date = addDays(today, dayOffset);
    const freeWindows = buildFreeWindows({
      date,
      availableStart: "20:00",
      availableEnd: "23:00",
      includeTimeBlocks: true
    });
    const windowCursors = freeWindows.map((window) => ({
      ...window,
      cursor_minutes: timeToMinutes(window.start.slice(11, 16)),
      end_minutes: timeToMinutes(window.end.slice(11, 16))
    }));
    const scheduledForDate = [];

    for (let index = 0; index < unscheduled.length; index += 1) {
      const task = unscheduled[index];
      const duration = Math.min(Math.max(task.estimated_minutes ?? 45, 15), 90);
      const window = windowCursors.find((item) => item.cursor_minutes + duration <= item.end_minutes);
      if (!window) continue;

      const suggestedStart = `${date}T${minutesToTime(window.cursor_minutes)}:00+07:00`;
      const suggestedEnd = `${date}T${minutesToTime(window.cursor_minutes + duration)}:00+07:00`;
      const rescheduleItem = {
        task_id: task.id,
        title: task.title,
        suggested_start: suggestedStart,
        suggested_end: suggestedEnd,
        duration_minutes: duration,
        reason: `Still open after today's plan; moved into an open ${window.label.toLowerCase()}.`,
        free_window_id: window.id
      };

      items.push(rescheduleItem);
      scheduledForDate.push(rescheduleItem);
      window.cursor_minutes += duration;

      if (window.cursor_minutes + 10 <= window.end_minutes) {
        window.cursor_minutes += 10;
      }

      unscheduled.splice(index, 1);
      index -= 1;
    }

    dayPlans.push({
      date,
      free_windows: freeWindows,
      blocked_intervals: selectBusyIntervalsForDate(date, { includeTimeBlocks: true }),
      scheduled: scheduledForDate
    });
  }

  const conflicts = findRescheduleConflicts(items);

  return {
    items,
    validation: {
      policy: "reschedule_unfinished_tasks_into_open_evening_windows",
      requested_window: {
        start_time: "20:00",
        end_time: "23:00"
      },
      day_plans: dayPlans,
      conflict_count: conflicts.length,
      scheduled_tasks: items.length,
      scheduled_minutes: sumMinutes(items.map((item) => ({ start_at: item.suggested_start, end_at: item.suggested_end }))),
      unscheduled_task_ids: unscheduled.map((task) => task.id)
    }
  };
}

function findRescheduleConflicts(items) {
  const conflicts = [];
  const byDate = new Map();

  for (const item of items) {
    const date = item.suggested_start.slice(0, 10);
    const blocks = byDate.get(date) ?? [];
    blocks.push({
      id: item.task_id,
      title: item.title,
      start_at: item.suggested_start,
      end_at: item.suggested_end
    });
    byDate.set(date, blocks);
  }

  for (const [date, blocks] of byDate.entries()) {
    conflicts.push(...findPlanConflicts(date, blocks, null));
  }

  return conflicts;
}

function normalizeReviewRescheduleItem(item) {
  if (!item || typeof item !== "object" || typeof item.task_id !== "string" || typeof item.suggested_start !== "string") return null;
  const durationMinutes = Number.isFinite(item.duration_minutes) ? item.duration_minutes : 45;
  const suggestedEnd = typeof item.suggested_end === "string" ? item.suggested_end : addMinutesIso(item.suggested_start, durationMinutes);

  return {
    task_id: item.task_id,
    title: typeof item.title === "string" ? item.title : item.task_id,
    suggested_start: item.suggested_start,
    suggested_end: suggestedEnd,
    duration_minutes: durationMinutes
  };
}

function intervalsOverlap(startA, endA, startB, endB) {
  return Date.parse(startA) < Date.parse(endB) && Date.parse(startB) < Date.parse(endA);
}

function getTodayDate() {
  return getLocalDate();
}

function getDailyPlanId(date) {
  return `daily_plan_${date.replaceAll("-", "_")}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function sumMinutes(blocks) {
  return blocks.reduce((sum, block) => sum + minutesBetween(block.start_at ?? block.start, block.end_at ?? block.end), 0);
}

function minutesBetween(start, end) {
  return Math.max(Math.round((Date.parse(end) - Date.parse(start)) / 60000), 0);
}

function availableMinutesForDate(date) {
  const blocks = sqlite
    .prepare("SELECT start_at, end_at FROM calendar_blocks WHERE type = 'available' AND substr(start_at, 1, 10) = ?")
    .all(date);
  const total = sumMinutes(blocks);
  return total || 180;
}

function buildOverloadSummary(plannedMinutes, availableMinutes, tasks) {
  const openEstimate = tasks
    .filter((task) => ACTIVE_TASK_STATUSES.includes(task.status))
    .reduce((sum, task) => sum + (task.estimated_minutes ?? 30), 0);
  const pressure = Math.max(plannedMinutes, openEstimate);
  const overloaded = pressure > availableMinutes;

  return {
    level: overloaded ? "high" : pressure > availableMinutes * 0.8 ? "watch" : "clear",
    planned_minutes: plannedMinutes,
    available_minutes: availableMinutes,
    open_estimated_minutes: openEstimate,
    message: overloaded
      ? `You have about ${Math.round(pressure / 60)}h of work against ${Math.round(availableMinutes / 60)}h free.`
      : "Today's plan fits the available time.",
    suggestions: overloaded
      ? ["Keep the top 2 tasks", "Move low-priority work to tomorrow", "Reduce scope before 22:00"]
      : ["Start the suggested focus block", "Keep review short"]
  };
}

function buildHabitInsight(habit) {
  if (habit.logged_count >= habit.target_count) {
    return `${habit.title} is on pace this week.`;
  }

  return `${habit.title} is below target; schedule a smaller block.`;
}

function buildInboxOrganizationActions(tasks) {
  const targets = {
    learning: {
      label: "Learning",
      goal_id: "goal_learning",
      project_id: "project_aws_security",
      priority_floor: 60,
      reason: "Learning material should stay with the AWS/security study track."
    },
    project: {
      label: "Project",
      goal_id: "goal_helpme_ai_life_admin",
      project_id: "project_helpme_mvp_ui",
      priority_floor: 70,
      reason: "HelpMe product work should remain close to the active MVP build."
    },
    personal: {
      label: "Personal",
      goal_id: "goal_personal_focus",
      project_id: "project_evening_reset",
      priority_floor: 25,
      reason: "Small life-admin items should stay outside the core work lane."
    }
  };

  return tasks.map((task) => {
    const group = classifyInboxTask(task);
    const target = resolveInboxTarget(targets[group], task);

    return {
      task_id: task.id,
      title: task.title,
      from_status: task.status,
      target_status: "todo",
      group,
      group_label: targets[group].label,
      goal_id: target.goal_id,
      goal_title: target.goal_title,
      project_id: target.project_id,
      project_title: target.project_title,
      priority: Math.max(task.priority ?? 0, targets[group].priority_floor),
      estimated_minutes: task.estimated_minutes ?? 30,
      reason: targets[group].reason
    };
  });
}

function classifyInboxTask(task) {
  if (/aws|study|read|learn|whitepaper/i.test(task.title)) return "learning";
  if (/helpme|report|design|product|mvp|ui|ux/i.test(task.title)) return "project";
  return "personal";
}

function resolveInboxTarget(config, task) {
  const goal =
    sqlite.prepare("SELECT id, title FROM goals WHERE id = ?").get(config.goal_id) ??
    sqlite.prepare("SELECT id, title FROM goals WHERE id = ?").get(task.goal_id) ??
    sqlite.prepare("SELECT id, title FROM goals ORDER BY is_north_star DESC, priority DESC LIMIT 1").get();
  const project =
    sqlite.prepare("SELECT id, title FROM projects WHERE id = ?").get(config.project_id) ??
    sqlite.prepare("SELECT id, title FROM projects WHERE id = ?").get(task.project_id);

  return {
    goal_id: goal?.id ?? task.goal_id,
    goal_title: goal?.title ?? task.goal_title ?? null,
    project_id: project?.id ?? task.project_id ?? null,
    project_title: project?.title ?? task.project_title ?? null
  };
}

function groupInboxActions(actions) {
  return {
    learning: actions.filter((action) => action.group === "learning"),
    project: actions.filter((action) => action.group === "project"),
    personal: actions.filter((action) => action.group === "personal")
  };
}

function normalizeInboxAction(action) {
  if (!action || typeof action !== "object" || typeof action.task_id !== "string") return null;

  return {
    task_id: action.task_id,
    target_status: typeof action.target_status === "string" ? action.target_status : "todo",
    group: typeof action.group === "string" ? action.group : "personal",
    goal_id: typeof action.goal_id === "string" ? action.goal_id : null,
    project_id: typeof action.project_id === "string" ? action.project_id : null,
    priority: Number.isFinite(action.priority) ? action.priority : 50,
    estimated_minutes: Number.isFinite(action.estimated_minutes) ? action.estimated_minutes : 30
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTime(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesIso(value, minutes) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function formatDisplayTime(value) {
  return value.replace("T", " ").slice(0, 16);
}
