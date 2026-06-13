import { randomUUID } from "node:crypto";
import {
  ACTIVE_TASK_STATUSES,
  DONE_TASK_STATUSES,
  classifyDeadline,
  createPlannerDecision,
  getLocalDate,
  isSameDate,
  scoreDeadlinePressure,
  generatePlanWithLlm
} from "../ai/planner.mjs";
import { sqlite } from "./client.mjs";

export function getTodayView() {
  const today = getTodayDate();
  syncAutomaticReminders(today);
  const { due: dueReminders } = getReminders(today);
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
    greeting: `Good evening, ${getSetting("display_name", "Tuan")}.`,
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
    ].sort((a, b) => a.start.localeCompare(b.start)),
    reminders: dueReminders
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

export function getCalendarView(mode = "day", startDate) {
  const startDay = startDate || getTodayDate();
  const startSetting = getSetting("working_window_start", "20:00");
  const endSetting = getSetting("working_window_end", "23:00");

  if (mode === "week") {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(startDay, i);
      days.push({
        date,
        events: selectCalendarEventsForDate(date),
        time_blocks: selectTimeBlocksForDate(date),
        free_windows: buildFreeWindows({
          date,
          availableStart: startSetting,
          availableEnd: endSetting,
          includeTimeBlocks: true
        })
      });
    }
    return {
      mode: "week",
      start_date: startDay,
      days
    };
  }

  // default to day mode
  return {
    mode: "day",
    date: startDay,
    events: selectCalendarEventsForDate(startDay),
    time_blocks: selectTimeBlocksForDate(startDay),
    free_windows: buildFreeWindows({
      date: startDay,
      availableStart: startSetting,
      availableEnd: endSetting,
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

export async function createPlanDayProposal({ availableStart = "20:00", availableEnd = "23:00", userMessage = "" } = {}) {
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
  const allTasks = rankOpenTasks(selectTasks(), selectDeadlines(), { today: date, availableMinutes }).filter((task) => task.status !== "inbox");

  let selectedTasks = allTasks;
  let explanation = null;
  let overloadResolutionSummary = null;
  let aiMetadata = {
    provider: "rule-based",
    used_fallback: true,
    fallback_reason: "Ollama did not generate plan candidates.",
    run_id: null
  };

  try {
    const llmPlan = await generatePlanWithLlm({
      tasks: allTasks,
      freeWindows,
      availableMinutes,
      userMessage,
      today: date
    });

    if (llmPlan && Array.isArray(llmPlan.selected_task_ids) && llmPlan.selected_task_ids.length > 0) {
      const selectedMap = new Map(llmPlan.selected_task_ids.map((id, index) => [id, index]));
      selectedTasks = allTasks
        .filter((task) => selectedMap.has(task.id))
        .sort((a, b) => selectedMap.get(a.id) - selectedMap.get(b.id));

      explanation = llmPlan.plan_explanation;
      overloadResolutionSummary = llmPlan.overload_resolution_summary;
      aiMetadata = {
        provider: "ollama",
        used_fallback: false,
        run_id: llmPlan.run_id
      };
    }
  } catch (error) {
    overloadResolutionSummary = "Hệ thống tự động sắp xếp dựa trên độ ưu tiên và thời hạn do AI ngoại tuyến.";
    aiMetadata.fallback_reason = error instanceof Error ? error.message : String(error);
  }

  const blocks = [];
  const windowCursors = freeWindows.map((window) => ({
    ...window,
    cursor_minutes: timeToMinutes(window.start.slice(11, 16)),
    end_minutes: timeToMinutes(window.end.slice(11, 16))
  }));

  for (const task of selectedTasks) {
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
    taskCount: allTasks.length
  });

  const proposal = createActionProposal({
    intent: "plan_day",
    title: "Plan today",
    summary: explanation ?? `Create ${blocks.length} conflict-free time block${blocks.length === 1 ? "" : "s"} between ${availableStart} and ${availableEnd}.`,
    payload: {
      plan_date: date,
      available_start: availableStart,
      available_end: availableEnd,
      validation,
      blocks
    }
  });

  return {
    blocks,
    proposal,
    validation,
    explanation,
    overload_resolution_summary: overloadResolutionSummary,
    ai: aiMetadata
  };
}

export function createTaskProposal({ title, dueAt = null, scheduledStart = null, estimatedMinutes = 30, priority = 50, create_reminder = false }) {
  const scheduledEnd = scheduledStart ? addMinutesIso(scheduledStart, estimatedMinutes) : null;
  const validation = buildCreateTaskValidation({
    title,
    scheduledStart,
    scheduledEnd,
    estimatedMinutes
  });

  return createActionProposal({
    intent: "create_task",
    title: `Create task: ${title}`,
    summary: scheduledStart
      ? `Validate and schedule "${title}" at ${formatDisplayTime(scheduledStart)}.`
      : `Add "${title}" to your task list.`,
    payload: {
      title,
      due_at: dueAt,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      estimated_minutes: estimatedMinutes,
      priority,
      create_reminder,
      validation
    }
  });
}

export function createRescheduleProposal({ taskId, scheduledStart, estimatedMinutes = 30 }) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }
  const scheduledEnd = addMinutesIso(scheduledStart, estimatedMinutes);
  const validation = buildCreateTaskValidation({
    title: task.title,
    taskId,
    scheduledStart,
    scheduledEnd,
    estimatedMinutes,
    ignoreTaskId: taskId
  });

  return createActionProposal({
    intent: "reschedule_task",
    title: `Reschedule: ${task.title}`,
    summary: `Validate and move "${task.title}" to ${formatDisplayTime(scheduledStart)}.`,
    payload: {
      task_id: taskId,
      title: task.title,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      estimated_minutes: estimatedMinutes,
      validation
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

export function rejectActionProposal(proposalId) {
  const proposal = sqlite.prepare("SELECT * FROM ai_action_proposals WHERE id = ?").get(proposalId);
  if (!proposal) {
    return { ok: false, error: "Proposal not found." };
  }

  if (proposal.status !== "pending") {
    return { ok: false, error: `Proposal is already ${proposal.status}.` };
  }

  sqlite
    .prepare("UPDATE ai_action_proposals SET status = 'rejected' WHERE id = ?")
    .run(proposalId);

  return {
    ok: true,
    proposal: {
      id: proposal.id,
      intent: proposal.intent,
      title: proposal.title,
      summary: proposal.summary,
      status: "rejected"
    }
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

export function createTask(data) {
  const id = `task_${randomUUID()}`;
  const now = new Date().toISOString();

  let goalId = data.goal_id ?? data.goalId ?? null;
  if (!goalId) {
    const defaultGoal = sqlite.prepare("SELECT id FROM goals ORDER BY is_north_star DESC, priority DESC LIMIT 1").get();
    goalId = defaultGoal?.id ?? "goal_helpme_ai_life_admin";
  }

  const scheduledStart = data.scheduled_start ?? data.scheduledStart ?? null;
  const estimatedMinutes = Number(data.estimated_minutes ?? data.estimatedMinutes ?? 30);
  const scheduledEnd = data.scheduled_end ?? data.scheduledEnd ?? (scheduledStart ? addMinutesIso(scheduledStart, estimatedMinutes) : null);

  const validation = buildCreateTaskValidation({
    title: data.title,
    scheduledStart,
    scheduledEnd,
    estimatedMinutes
  });

  if (validation.conflict_count > 0) {
    return { ok: false, error: `Calendar conflicts detected.`, validation };
  }

  sqlite
    .prepare(
      `INSERT INTO tasks (
        id, goal_id, project_id, parent_task_id, title, description, status, priority,
        estimated_minutes, due_at, scheduled_start, scheduled_end, fits_available_time,
        visible_in_now, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
    )
    .run(
      id,
      goalId,
      data.project_id ?? data.projectId ?? null,
      data.parent_task_id ?? data.parentTaskId ?? null,
      data.title || "Untitled Task",
      data.description ?? null,
      data.status ?? "todo",
      Number(data.priority ?? 50),
      estimatedMinutes,
      data.due_at ?? data.dueAt ?? null,
      scheduledStart,
      scheduledEnd,
      now,
      now
    );

  return { ok: true, task: selectTasks().find((t) => t.id === id), validation };
}

export function updateTask(taskId, data) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  const now = new Date().toISOString();

  const title = data.title !== undefined ? data.title : task.title;
  const description = data.description !== undefined ? data.description : task.description;
  const status = data.status !== undefined ? data.status : task.status;
  const priority = data.priority !== undefined ? Number(data.priority) : task.priority;
  const estimatedMinutes = data.estimated_minutes !== undefined ? Number(data.estimated_minutes) : (data.estimatedMinutes !== undefined ? Number(data.estimatedMinutes) : task.estimated_minutes);
  const goalId = data.goal_id !== undefined ? data.goal_id : (data.goalId !== undefined ? data.goalId : task.goal_id);
  const projectId = data.project_id !== undefined ? data.project_id : (data.projectId !== undefined ? data.projectId : task.project_id);
  const dueAt = data.due_at !== undefined ? data.due_at : (data.dueAt !== undefined ? data.dueAt : task.due_at);
  const scheduledStart = data.scheduled_start !== undefined ? data.scheduled_start : (data.scheduledStart !== undefined ? data.scheduledStart : task.scheduled_start);
  const scheduledEnd = data.scheduled_end !== undefined ? data.scheduled_end : (data.scheduledEnd !== undefined ? data.scheduledEnd : task.scheduled_end);

  let finalScheduledEnd = scheduledEnd;
  if (scheduledStart && !scheduledEnd && (scheduledStart !== task.scheduled_start || estimatedMinutes !== task.estimated_minutes)) {
    finalScheduledEnd = addMinutesIso(scheduledStart, estimatedMinutes || 30);
  }

  if (scheduledStart !== task.scheduled_start || finalScheduledEnd !== task.scheduled_end || estimatedMinutes !== task.estimated_minutes) {
    const validation = buildCreateTaskValidation({
      title,
      taskId,
      scheduledStart,
      scheduledEnd: finalScheduledEnd,
      estimatedMinutes,
      ignoreTaskId: taskId
    });

    if (validation.conflict_count > 0) {
      return { ok: false, error: `Calendar conflicts detected.`, validation };
    }
  }

  sqlite
    .prepare(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, estimated_minutes = ?,
           goal_id = ?, project_id = ?, due_at = ?, scheduled_start = ?, scheduled_end = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      title,
      description,
      status,
      priority,
      estimatedMinutes,
      goalId,
      projectId,
      dueAt,
      scheduledStart,
      finalScheduledEnd,
      now,
      taskId
    );

  return { ok: true, task: selectTasks().find((item) => item.id === taskId) };
}

export function deleteTask(taskId) {
  const task = selectTasks().find((item) => item.id === taskId);
  if (!task) {
    return { ok: false, error: "Task not found." };
  }

  sqlite
    .prepare("UPDATE tasks SET status = 'cancelled', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), taskId);

  return { ok: true, task_id: taskId, status: "cancelled" };
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
    const validation = buildCreateTaskValidation({
      title: payload.title,
      scheduledStart: payload.scheduled_start ?? null,
      scheduledEnd: payload.scheduled_end ?? (payload.scheduled_start ? addMinutesIso(payload.scheduled_start, payload.estimated_minutes ?? 30) : null),
      estimatedMinutes: payload.estimated_minutes ?? 30
    });

    if (validation.conflict_count > 0) {
      throw new Error(`Task schedule has ${validation.conflict_count} calendar conflict${validation.conflict_count === 1 ? "" : "s"}.`);
    }

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
        payload.scheduled_end ?? (payload.scheduled_start ? addMinutesIso(payload.scheduled_start, payload.estimated_minutes ?? 30) : null),
        now,
        now
      );

    if (payload.create_reminder && payload.scheduled_start) {
      const reminderId = `reminder_${randomUUID()}`;
      sqlite.prepare(`
        INSERT INTO reminders (id, title, remind_at, status, task_id, deadline_id, created_at, updated_at)
        VALUES (?, ?, ?, 'scheduled', ?, NULL, ?, ?)
      `).run(reminderId, `Bắt đầu công việc: ${payload.title}`, payload.scheduled_start, id, now, now);
    }

    return { task_id: id, validation };
  }

  if (intent === "create_reminder") {
    const id = `reminder_${randomUUID()}`;
    const now = new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO reminders (id, title, remind_at, status, task_id, deadline_id, created_at, updated_at)
      VALUES (?, ?, ?, 'scheduled', NULL, NULL, ?, ?)
    `).run(id, payload.title, payload.remind_at, now, now);
    return { reminder_id: id };
  }

  if (intent === "reschedule_task") {
    const validation = buildCreateTaskValidation({
      title: payload.title ?? payload.task_id,
      taskId: payload.task_id,
      scheduledStart: payload.scheduled_start,
      scheduledEnd: payload.scheduled_end ?? addMinutesIso(payload.scheduled_start, payload.estimated_minutes ?? 30),
      estimatedMinutes: payload.estimated_minutes ?? 30,
      ignoreTaskId: payload.task_id
    });

    if (validation.conflict_count > 0) {
      throw new Error(`Task reschedule has ${validation.conflict_count} calendar conflict${validation.conflict_count === 1 ? "" : "s"}.`);
    }

    sqlite
      .prepare("UPDATE tasks SET scheduled_start = ?, scheduled_end = ?, estimated_minutes = ?, updated_at = ? WHERE id = ?")
      .run(payload.scheduled_start, payload.scheduled_end, payload.estimated_minutes, new Date().toISOString(), payload.task_id);
    return { task_id: payload.task_id, validation };
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

  if (intent === "breakdown_task") {
    const now = new Date().toISOString();
    const parentTaskId = payload.parent_task_id;
    const parentTask = sqlite.prepare("SELECT * FROM tasks WHERE id = ?").get(parentTaskId);
    if (!parentTask) {
      throw new Error("Parent task not found.");
    }

    let projectId = parentTask.project_id;
    if (!projectId) {
      projectId = `project_${randomUUID()}`;
      sqlite
        .prepare(
          `INSERT INTO projects (id, goal_id, title, description, status, priority, created_at, updated_at)
           VALUES (?, ?, ?, 'Auto-created during task breakdown', 'active', 50, ?, ?)`
        )
        .run(projectId, parentTask.goal_id, payload.new_project_title || parentTask.title, now, now);

      sqlite
        .prepare("UPDATE tasks SET project_id = ?, updated_at = ? WHERE id = ?")
        .run(projectId, now, parentTaskId);
    }

    const subtasks = Array.isArray(payload.subtasks) ? payload.subtasks : [];
    for (const subtask of subtasks) {
      const subtaskId = `task_${randomUUID()}`;
      sqlite
        .prepare(
          `INSERT INTO tasks (
            id, goal_id, project_id, parent_task_id, title, description, status, priority,
            estimated_minutes, due_at, scheduled_start, scheduled_end, fits_available_time,
            visible_in_now, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NULL, 'todo', ?, ?, NULL, NULL, NULL, 1, 0, ?, ?)`
        )
        .run(
          subtaskId,
          parentTask.goal_id,
          projectId,
          parentTaskId,
          subtask.title,
          subtask.priority ?? 55,
          subtask.estimated_minutes ?? 30,
          now,
          now
        );
    }

    return {
      parent_task_id: parentTaskId,
      project_id: projectId,
      created_subtasks_count: subtasks.length
    };
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

  if (intent === "create_event") {
    const validation = buildCalendarConflictValidation({
      startAt: payload.start_at,
      endAt: payload.end_at
    });
    if (validation.conflict_count > 0) {
      throw new Error(`Event has ${validation.conflict_count} calendar conflict${validation.conflict_count === 1 ? "" : "s"}.`);
    }

    const result = createCalendarEvent({
      title: payload.title,
      start_at: payload.start_at,
      end_at: payload.end_at,
      location: payload.location ?? null,
      source: payload.source ?? "ai_generated"
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to create event.");
    }
    return { event_id: result.event.id };
  }

  if (intent === "create_time_block") {
    const validation = buildCalendarConflictValidation({
      startAt: payload.start_at,
      endAt: payload.end_at
    });
    if (validation.conflict_count > 0) {
      throw new Error(`Time block has ${validation.conflict_count} calendar conflict${validation.conflict_count === 1 ? "" : "s"}.`);
    }

    const result = createTimeBlock({
      title: payload.title,
      start_at: payload.start_at,
      end_at: payload.end_at,
      type: payload.type ?? "task",
      status: payload.status ?? "planned"
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to create time block.");
    }
    return { time_block_id: result.time_block.id };
  }

  if (intent === "bulk_reschedule") {
    const now = new Date().toISOString();
    const items = Array.isArray(payload.reschedule) ? payload.reschedule : [];
    let moved = 0;

    for (const item of items) {
      if (!item.task_id || !item.scheduled_start) continue;
      const scheduledEnd = item.scheduled_end ?? addMinutesIso(item.scheduled_start, item.estimated_minutes ?? 30);
      sqlite
        .prepare("UPDATE tasks SET scheduled_start = ?, scheduled_end = ?, updated_at = ? WHERE id = ?")
        .run(item.scheduled_start, scheduledEnd, now, item.task_id);
      moved++;
    }

    return { rescheduled_tasks: moved, target_date: payload.target_date };
  }

  if (intent === "create_deadline") {
    const result = createDeadline({
      title: payload.title,
      due_at: payload.due_at,
      severity: payload.severity ?? "medium",
      status: payload.status ?? "active",
      goal_id: payload.goal_id ?? null,
      project_id: payload.project_id ?? null,
      task_id: payload.task_id ?? null
    });

    if (!result.ok) {
      throw new Error(result.error || "Failed to create deadline.");
    }
    return { deadline_id: result.deadline.id };
  }

  return { ignored: true };
}

export function selectTasks() {
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
      `SELECT d.*, t.title AS task_title, g.title AS goal_title, p.title AS project_title
       FROM deadlines d
       LEFT JOIN tasks t ON t.id = d.task_id
       LEFT JOIN goals g ON g.id = d.goal_id
       LEFT JOIN projects p ON p.id = d.project_id
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
  const defaultStart = getSetting("working_window_start", "20:00");
  const defaultEnd = getSetting("working_window_end", "23:00");
  const finalStart = availableStart || defaultStart;
  const finalEnd = availableEnd || defaultEnd;

  const baseWindow = {
    id: "free_requested_window",
    start: `${date}T${finalStart}:00+07:00`,
    end: `${date}T${finalEnd}:00+07:00`,
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

function selectBusyIntervalsForDate(date, { replacePlanId = null, includeTimeBlocks = true, ignoreTaskId = null } = {}) {
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
  const scheduledTasks = selectScheduledTaskIntervalsForDate(date, ignoreTaskId);

  return [...events, ...blocks, ...scheduledTasks]
    .filter((item) => item.start && item.end && Date.parse(item.end) > Date.parse(item.start))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function selectScheduledTaskIntervalsForDate(date, ignoreTaskId = null) {
  return selectTasks()
    .filter((task) => task.id !== ignoreTaskId)
    .filter((task) => task.scheduled_start && task.scheduled_end && task.scheduled_start.slice(0, 10) === date && !DONE_TASK_STATUSES.includes(task.status))
    .map((task) => ({
      id: task.id,
      title: task.title,
      type: "task",
      start: task.scheduled_start,
      end: task.scheduled_end,
      source: "scheduled_task"
    }));
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

function buildCreateTaskValidation({ title, taskId = null, scheduledStart, scheduledEnd, estimatedMinutes, ignoreTaskId = null }) {
  if (!scheduledStart || !scheduledEnd) {
    return {
      policy: "validate_only_when_task_has_schedule",
      scheduled: false,
      conflict_count: 0,
      blocked_intervals: [],
      checked_block: null
    };
  }

  const date = scheduledStart.slice(0, 10);
  const checkedBlock = {
    task_id: taskId,
    title,
    start_at: scheduledStart,
    end_at: scheduledEnd,
    estimated_minutes: estimatedMinutes
  };
  const conflicts = findPlanConflicts(date, [checkedBlock], null, { ignoreTaskId });

  return {
    policy: "avoid_calendar_events_and_locked_time_blocks",
    scheduled: true,
    conflict_count: conflicts.length,
    checked_block: checkedBlock,
    blocked_intervals: selectBusyIntervalsForDate(date, { includeTimeBlocks: true, ignoreTaskId }),
    conflicts: conflicts.map((conflict) => ({
      title: conflict.busy.title,
      start: conflict.busy.start ?? conflict.busy.start_at,
      end: conflict.busy.end ?? conflict.busy.end_at,
      source: conflict.busy.source ?? conflict.busy.type ?? "existing_block"
    }))
  };
}

function findPlanConflicts(date, blocks, replacePlanId, options = {}) {
  const busyIntervals = selectBusyIntervalsForDate(date, { replacePlanId, includeTimeBlocks: true, ignoreTaskId: options.ignoreTaskId ?? null });
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
  if (total) return total;

  const start = getSetting("working_window_start", "20:00");
  const end = getSetting("working_window_end", "23:00");
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  return Math.max(endMin - startMin, 0) || 180;
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

export function getSetting(key, defaultValue) {
  try {
    const row = sqlite.prepare("SELECT value_json FROM settings WHERE key = ?").get(key);
    if (row) return JSON.parse(row.value_json);
  } catch (error) {
    // Ignore error
  }
  return defaultValue;
}

export function getSettings() {
  const rows = sqlite.prepare("SELECT key, value_json FROM settings").all();
  const result = {};
  for (const row of rows) {
    result[row.key] = JSON.parse(row.value_json);
  }
  return result;
}

export function updateSettings(newSettings) {
  const now = new Date().toISOString();
  sqlite.transaction(() => {
    for (const [key, value] of Object.entries(newSettings)) {
      sqlite
        .prepare(
          `INSERT INTO settings (id, key, value_json, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
        )
        .run(`setting_${key}`, key, JSON.stringify(value), now);
    }
  })();
  return getSettings();
}

export function getCurrentIsoTime() {
  if (process.env.HELPME_TODAY) {
    return `${process.env.HELPME_TODAY.slice(0, 10)}T22:00:00+07:00`;
  }
  return new Date().toISOString();
}

function subtractDays(dateStr, days) {
  const date = new Date(dateStr.slice(0, 10) + "T00:00:00");
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function selectReminders() {
  return sqlite
    .prepare(
      `SELECT r.*, t.title AS task_title, d.title AS deadline_title
       FROM reminders r
       LEFT JOIN tasks t ON t.id = r.task_id
       LEFT JOIN deadlines d ON d.id = r.deadline_id
       ORDER BY r.remind_at ASC`
    )
    .all();
}

export function syncAutomaticReminders(today) {
  const nowStr = new Date().toISOString();

  // 1. Clear reminders for done/cancelled tasks or completed deadlines
  sqlite.prepare("DELETE FROM reminders WHERE task_id IN (SELECT id FROM tasks WHERE status IN ('done', 'cancelled'))").run();
  sqlite.prepare("DELETE FROM reminders WHERE deadline_id IN (SELECT id FROM deadlines WHERE status = 'completed')").run();

  // 2. Sync scheduled tasks
  const tasks = selectTasks().filter((t) => t.scheduled_start && t.status !== "cancelled" && t.status !== "done");
  for (const task of tasks) {
    const existing = sqlite.prepare("SELECT * FROM reminders WHERE task_id = ?").get(task.id);
    if (!existing) {
      const id = `reminder_${randomUUID()}`;
      sqlite.prepare(`
        INSERT INTO reminders (id, title, remind_at, status, task_id, deadline_id, created_at, updated_at)
        VALUES (?, ?, ?, 'scheduled', ?, NULL, ?, ?)
      `).run(id, `Bắt đầu công việc: ${task.title}`, task.scheduled_start, task.id, nowStr, nowStr);
    } else if (existing.remind_at !== task.scheduled_start || existing.title !== `Bắt đầu công việc: ${task.title}`) {
      sqlite.prepare("UPDATE reminders SET remind_at = ?, title = ?, updated_at = ? WHERE id = ?")
        .run(task.scheduled_start, `Bắt đầu công việc: ${task.title}`, nowStr, existing.id);
    }
  }

  // 3. Sync deadlines (1 day before at 09:00 AM)
  const deadlineList = selectDeadlines();
  for (const dl of deadlineList) {
    if (!dl.due_at) continue;
    const remindDate = subtractDays(dl.due_at, 1);
    const remindAt = `${remindDate}T09:00:00+07:00`;
    const existing = sqlite.prepare("SELECT * FROM reminders WHERE deadline_id = ?").get(dl.id);
    if (!existing) {
      const id = `reminder_${randomUUID()}`;
      sqlite.prepare(`
        INSERT INTO reminders (id, title, remind_at, status, task_id, deadline_id, created_at, updated_at)
        VALUES (?, ?, ?, 'scheduled', NULL, ?, ?, ?)
      `).run(id, `Hạn chót sắp tới: ${dl.title}`, remindAt, dl.id, nowStr, nowStr);
    } else if (existing.remind_at !== remindAt || existing.title !== `Hạn chót sắp tới: ${dl.title}`) {
      sqlite.prepare("UPDATE reminders SET remind_at = ?, title = ?, updated_at = ? WHERE id = ?")
        .run(remindAt, `Hạn chót sắp tới: ${dl.title}`, nowStr, existing.id);
    }
  }
}

export function getReminders(today = getTodayDate()) {
  syncAutomaticReminders(today);
  const nowIso = getCurrentIsoTime();
  const all = selectReminders();

  const active = all.filter((r) => r.status === "scheduled" || r.status === "snoozed");
  const due = active.filter((r) => r.remind_at <= nowIso);
  const upcoming = active.filter((r) => r.remind_at > nowIso);

  return { due, upcoming };
}

export function createReminder(data) {
  const id = `reminder_${randomUUID()}`;
  const now = new Date().toISOString();
  const title = data.title || "Nhắc nhở";
  const remindAt = data.remind_at || now;
  const taskId = data.task_id || null;
  const deadlineId = data.deadline_id || null;
  const status = data.status || "scheduled";

  sqlite
    .prepare(
      `INSERT INTO reminders (id, title, remind_at, status, task_id, deadline_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, title, remindAt, status, taskId, deadlineId, now, now);

  return { ok: true, reminder: { id, title, remind_at: remindAt, status, task_id: taskId, deadline_id: deadlineId } };
}

export function updateReminder(reminderId, data) {
  const existing = sqlite.prepare("SELECT * FROM reminders WHERE id = ?").get(reminderId);
  if (!existing) {
    return { ok: false, error: "Reminder not found." };
  }

  const title = data.title !== undefined ? data.title : existing.title;
  const remindAt = data.remind_at !== undefined ? data.remind_at : existing.remind_at;
  const status = data.status !== undefined ? data.status : existing.status;
  const now = new Date().toISOString();

  sqlite
    .prepare("UPDATE reminders SET title = ?, remind_at = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(title, remindAt, status, now, reminderId);

  return { ok: true, reminder: { id: reminderId, title, remind_at: remindAt, status } };
}

export function deleteReminder(reminderId) {
  const existing = sqlite.prepare("SELECT * FROM reminders WHERE id = ?").get(reminderId);
  if (!existing) {
    return { ok: false, error: "Reminder not found." };
  }

  sqlite.prepare("DELETE FROM reminders WHERE id = ?").run(reminderId);
  return { ok: true, reminder_id: reminderId };
}

export function completeReminder(reminderId) {
  return updateReminder(reminderId, { status: "completed" });
}

function toLocalIsoString(date) {
  const localTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return localTime.toISOString().replace(/\.\d{3}Z$/, "+07:00").replace(/Z$/, "+07:00");
}

function addMinutesIso(value, minutes) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalIsoString(date);
}

export function snoozeReminder(reminderId, minutes = 15) {
  const existing = sqlite.prepare("SELECT * FROM reminders WHERE id = ?").get(reminderId);
  if (!existing) {
    return { ok: false, error: "Reminder not found." };
  }

  const nowIso = getCurrentIsoTime();
  const date = new Date(nowIso);
  date.setMinutes(date.getMinutes() + (typeof minutes === "number" ? minutes : 15));
  const remindAt = toLocalIsoString(date);

  return updateReminder(reminderId, { remind_at: remindAt, status: "snoozed" });
}

export function buildCalendarConflictValidation({ startAt, endAt, ignoreEventId = null, ignoreTimeBlockId = null }) {
  if (!startAt || !endAt) return { conflict_count: 0, conflicts: [] };

  const date = startAt.slice(0, 10);
  const events = selectCalendarEventsForDate(date).filter((e) => e.id !== ignoreEventId);
  const timeBlocks = selectTimeBlocksForDate(date).filter((tb) => tb.id !== ignoreTimeBlockId);

  const busyIntervals = [
    ...events.map(e => ({ title: e.title, start: e.start_at, end: e.end_at, source: e.source || "manual" })),
    ...timeBlocks.map(tb => ({ title: tb.title, start: tb.start_at, end: tb.end_at, source: tb.type || "task" }))
  ];

  const conflicts = [];
  for (const busy of busyIntervals) {
    if (intervalsOverlap(startAt, endAt, busy.start, busy.end)) {
      conflicts.push(busy);
    }
  }

  return {
    conflict_count: conflicts.length,
    conflicts
  };
}

export function createCalendarEvent(data) {
  const startAt = data.start_at;
  const endAt = data.end_at;
  const title = data.title || "Sự kiện mới";
  const location = data.location || null;
  const source = data.source || "manual";
  const linkedTaskId = data.linked_task_id || null;

  const validation = buildCalendarConflictValidation({ startAt, endAt });
  if (validation.conflict_count > 0) {
    return { ok: false, error: "Lịch trình bị trùng khớp với sự kiện khác.", validation };
  }

  const id = `event_${randomUUID()}`;
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO calendar_events (id, title, start_at, end_at, location, source, linked_task_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, title, startAt, endAt, location, source, linkedTaskId, now, now);

  return { ok: true, event: { id, title, start_at: startAt, end_at: endAt, location, source, linked_task_id: linkedTaskId } };
}

export function updateCalendarEvent(eventId, data) {
  const existing = sqlite.prepare("SELECT * FROM calendar_events WHERE id = ?").get(eventId);
  if (!existing) {
    return { ok: false, error: "Calendar event not found." };
  }

  const title = data.title !== undefined ? data.title : existing.title;
  const startAt = data.start_at !== undefined ? data.start_at : existing.start_at;
  const endAt = data.end_at !== undefined ? data.end_at : existing.end_at;
  const location = data.location !== undefined ? data.location : existing.location;
  const source = data.source !== undefined ? data.source : existing.source;
  const linkedTaskId = data.linked_task_id !== undefined ? data.linked_task_id : existing.linked_task_id;

  const validation = buildCalendarConflictValidation({ startAt, endAt, ignoreEventId: eventId });
  if (validation.conflict_count > 0) {
    return { ok: false, error: "Lịch trình bị trùng khớp với sự kiện khác.", validation };
  }

  const now = new Date().toISOString();
  sqlite
    .prepare(
      `UPDATE calendar_events
       SET title = ?, start_at = ?, end_at = ?, location = ?, source = ?, linked_task_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(title, startAt, endAt, location, source, linkedTaskId, now, eventId);

  return { ok: true, event: { id: eventId, title, start_at: startAt, end_at: endAt, location, source, linked_task_id: linkedTaskId } };
}

export function deleteCalendarEvent(eventId) {
  const existing = sqlite.prepare("SELECT * FROM calendar_events WHERE id = ?").get(eventId);
  if (!existing) {
    return { ok: false, error: "Calendar event not found." };
  }

  sqlite.prepare("DELETE FROM calendar_events WHERE id = ?").run(eventId);
  return { ok: true, event_id: eventId };
}

export function createTimeBlock(data) {
  const startAt = data.start_at;
  const endAt = data.end_at;
  const title = data.title || "Khung giờ";
  const taskId = data.task_id || null;
  const type = data.type || "task";
  const status = data.status || "planned";

  const date = startAt.slice(0, 10);
  const dailyPlanId = data.daily_plan_id || getDailyPlanId(date);

  const existingPlan = sqlite.prepare("SELECT * FROM daily_plans WHERE id = ?").get(dailyPlanId);
  if (!existingPlan) {
    const now = new Date().toISOString();
    sqlite
      .prepare(
        `INSERT INTO daily_plans (id, plan_date, status, summary, created_at, updated_at)
         VALUES (?, ?, 'draft', 'Auto-created plan', ?, ?)`
      )
      .run(dailyPlanId, date, now, now);
  }

  const validation = buildCalendarConflictValidation({ startAt, endAt });
  if (validation.conflict_count > 0) {
    return { ok: false, error: "Lịch trình bị trùng khớp với sự kiện khác.", validation };
  }

  const id = `time_block_${randomUUID()}`;
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO time_blocks (id, daily_plan_id, task_id, title, start_at, end_at, type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, dailyPlanId, taskId, title, startAt, endAt, type, status, now, now);

  return { ok: true, time_block: { id, daily_plan_id: dailyPlanId, task_id: taskId, title, start_at: startAt, end_at: endAt, type, status } };
}

export function updateTimeBlock(timeBlockId, data) {
  const existing = sqlite.prepare("SELECT * FROM time_blocks WHERE id = ?").get(timeBlockId);
  if (!existing) {
    return { ok: false, error: "Time block not found." };
  }

  const title = data.title !== undefined ? data.title : existing.title;
  const startAt = data.start_at !== undefined ? data.start_at : existing.start_at;
  const endAt = data.end_at !== undefined ? data.end_at : existing.end_at;
  const taskId = data.task_id !== undefined ? data.task_id : existing.task_id;
  const type = data.type !== undefined ? data.type : existing.type;
  const status = data.status !== undefined ? data.status : existing.status;
  const dailyPlanId = data.daily_plan_id !== undefined ? data.daily_plan_id : existing.daily_plan_id;

  const validation = buildCalendarConflictValidation({ startAt, endAt, ignoreTimeBlockId: timeBlockId });
  if (validation.conflict_count > 0) {
    return { ok: false, error: "Lịch trình bị trùng khớp với sự kiện khác.", validation };
  }

  const now = new Date().toISOString();
  sqlite
    .prepare(
      `UPDATE time_blocks
       SET title = ?, start_at = ?, end_at = ?, task_id = ?, type = ?, status = ?, daily_plan_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(title, startAt, endAt, taskId, type, status, dailyPlanId, now, timeBlockId);

  return { ok: true, time_block: { id: timeBlockId, daily_plan_id: dailyPlanId, task_id: taskId, title, start_at: startAt, end_at: endAt, type, status } };
}

export function deleteTimeBlock(timeBlockId) {
  const existing = sqlite.prepare("SELECT * FROM time_blocks WHERE id = ?").get(timeBlockId);
  if (!existing) {
    return { ok: false, error: "Time block not found." };
  }

  sqlite.prepare("DELETE FROM time_blocks WHERE id = ?").run(timeBlockId);
  return { ok: true, time_block_id: timeBlockId };
}

export function createDeadline(data) {
  const title = data.title || "Hạn chót mới";
  const dueAt = data.due_at || new Date().toISOString();
  const severity = data.severity || "medium";
  const status = data.status || "active";
  const goalId = data.goal_id || null;
  const projectId = data.project_id || null;
  const taskId = data.task_id || null;

  const id = `deadline_${randomUUID()}`;
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `INSERT INTO deadlines (id, title, due_at, severity, status, goal_id, project_id, task_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, title, dueAt, severity, status, goalId, projectId, taskId, now, now);

  syncAutomaticReminders(getTodayDate());

  return { ok: true, deadline: { id, title, due_at: dueAt, severity, status, goal_id: goalId, project_id: projectId, task_id: taskId } };
}

export function updateDeadline(deadlineId, data) {
  const existing = sqlite.prepare("SELECT * FROM deadlines WHERE id = ?").get(deadlineId);
  if (!existing) {
    return { ok: false, error: "Deadline not found." };
  }

  const title = data.title !== undefined ? data.title : existing.title;
  const dueAt = data.due_at !== undefined ? data.due_at : existing.due_at;
  const severity = data.severity !== undefined ? data.severity : existing.severity;
  const status = data.status !== undefined ? data.status : existing.status;
  const goalId = data.goal_id !== undefined ? data.goal_id : existing.goal_id;
  const projectId = data.project_id !== undefined ? data.project_id : existing.project_id;
  const taskId = data.task_id !== undefined ? data.task_id : existing.task_id;

  const now = new Date().toISOString();
  sqlite
    .prepare(
      `UPDATE deadlines
       SET title = ?, due_at = ?, severity = ?, status = ?, goal_id = ?, project_id = ?, task_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(title, dueAt, severity, status, goalId, projectId, taskId, now, deadlineId);

  syncAutomaticReminders(getTodayDate());

  return { ok: true, deadline: { id: deadlineId, title, due_at: dueAt, severity, status, goal_id: goalId, project_id: projectId, task_id: taskId } };
}

export function deleteDeadline(deadlineId) {
  const existing = sqlite.prepare("SELECT * FROM deadlines WHERE id = ?").get(deadlineId);
  if (!existing) {
    return { ok: false, error: "Deadline not found." };
  }

  sqlite.prepare("DELETE FROM deadlines WHERE id = ?").run(deadlineId);
  sqlite.prepare("DELETE FROM reminders WHERE deadline_id = ?").run(deadlineId);

  syncAutomaticReminders(getTodayDate());

  return { ok: true, deadline_id: deadlineId };
}

