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
    free_windows: [
      {
        id: "free_evening",
        start: `${today}T20:00:00+07:00`,
        end: `${today}T23:00:00+07:00`,
        label: "Evening focus window"
      }
    ]
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

  return {
    date: today,
    prompt: "Evening review",
    completed: completedToday,
    unfinished: unfinishedToday,
    energy_check: {
      value: "unknown",
      label: "Ask at review time"
    },
    reschedule_suggestion: unfinishedToday.map((task, index) => ({
      task_id: task.id,
      title: task.title,
      suggested_start: `${addDays(today, 1)}T${20 + index}:00:00+07:00`,
      reason: "Still open after today's plan."
    })),
    habit_insights: habitInsights,
    summary: `Today has ${completedToday.length} completed task and ${unfinishedToday.length} unfinished planned task.`
  };
}

export function organizeInboxIntoProposal() {
  const inboxTasks = selectTasks().filter((task) => task.status === "inbox");
  const groups = groupInboxTasks(inboxTasks);
  const proposal = createActionProposal({
    intent: "organize_inbox",
    title: "Organize inbox",
    summary: `Move ${inboxTasks.length} inbox task${inboxTasks.length === 1 ? "" : "s"} into working lists.`,
    payload: {
      groups,
      task_ids: inboxTasks.map((task) => task.id)
    }
  });

  return { groups, proposal };
}

export function createPlanDayProposal({ availableStart = "20:00", availableEnd = "23:00" } = {}) {
  const date = getTodayDate();
  const availableMinutes = timeToMinutes(availableEnd) - timeToMinutes(availableStart);
  const tasks = rankOpenTasks(selectTasks(), selectDeadlines(), { today: date, availableMinutes }).filter((task) => task.status !== "inbox");
  const blocks = [];
  let cursorMinutes = timeToMinutes(availableStart);
  const endMinutes = timeToMinutes(availableEnd);

  for (const task of tasks) {
    const duration = Math.min(task.estimated_minutes ?? 30, 90);
    if (cursorMinutes + duration > endMinutes) break;

    blocks.push({
      task_id: task.id,
      title: task.title,
      start_at: `${date}T${minutesToTime(cursorMinutes)}:00+07:00`,
      end_at: `${date}T${minutesToTime(cursorMinutes + duration)}:00+07:00`,
      type: "task"
    });
    cursorMinutes += duration;

    if (cursorMinutes + 10 <= endMinutes) {
      blocks.push({
        task_id: null,
        title: "Break",
        start_at: `${date}T${minutesToTime(cursorMinutes)}:00+07:00`,
        end_at: `${date}T${minutesToTime(cursorMinutes + 10)}:00+07:00`,
        type: "break"
      });
      cursorMinutes += 10;
    }
  }

  const proposal = createActionProposal({
    intent: "plan_day",
    title: "Plan today",
    summary: `Create ${blocks.length} time block${blocks.length === 1 ? "" : "s"} between ${availableStart} and ${availableEnd}.`,
    payload: {
      plan_date: date,
      available_start: availableStart,
      available_end: availableEnd,
      blocks
    }
  });

  return { blocks, proposal };
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
      reschedule: review.reschedule_suggestion
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
  const result = sqlite.transaction(() => {
    const applyResult = applyProposal(proposal.intent, payload);
    sqlite
      .prepare("UPDATE ai_action_proposals SET status = 'confirmed', confirmed_at = ? WHERE id = ?")
      .run(new Date().toISOString(), proposal.id);
    return applyResult;
  })();

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
    const planId = `daily_plan_${payload.plan_date.replaceAll("-", "_")}`;
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
    for (const taskId of payload.task_ids ?? []) {
      sqlite.prepare("UPDATE tasks SET status = 'todo', updated_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
    }

    return { organized_tasks: payload.task_ids?.length ?? 0 };
  }

  if (intent === "daily_review") {
    for (const item of payload.reschedule ?? []) {
      sqlite
        .prepare("UPDATE tasks SET scheduled_start = ?, scheduled_end = ?, updated_at = ? WHERE id = ?")
        .run(item.suggested_start, addMinutesIso(item.suggested_start, 45), new Date().toISOString(), item.task_id);
    }

    return { rescheduled_tasks: payload.reschedule?.length ?? 0 };
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

function getTodayDate() {
  return getLocalDate();
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function sumMinutes(blocks) {
  return blocks.reduce((sum, block) => sum + minutesBetween(block.start_at, block.end_at), 0);
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

function groupInboxTasks(tasks) {
  return {
    learning: tasks.filter((task) => /aws|study|read|learn/i.test(task.title)),
    project: tasks.filter((task) => /helpme|report|design|product/i.test(task.title)),
    personal: tasks.filter((task) => !/aws|study|read|learn|helpme|report|design|product/i.test(task.title))
  };
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
