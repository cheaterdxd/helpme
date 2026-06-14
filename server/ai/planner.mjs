import { z } from "zod";
import { runOllamaJson } from "./ollama-client.mjs";

export const ACTIVE_TASK_STATUSES = ["open", "todo", "doing", "in_focus", "inbox"];
export const PLANNABLE_TASK_STATUSES = ["open", "todo", "doing", "in_focus"];
export const DONE_TASK_STATUSES = ["done", "cancelled"];

export function createPlannerDecision({ tasks, deadlines, today = getLocalDate(), availableMinutes = 90 }) {
  const rankings = rankTasks({ tasks, deadlines, today, availableMinutes });
  const selected = rankings[0] ?? null;

  return {
    mode: "rule-based",
    selected_task_id: selected?.id ?? null,
    reason_summary: selected?.reason_summary ?? "No plannable task is available.",
    risk_summary: selected?.risk_summary ?? "Without open tasks, HelpMe can only wait or review.",
    rankings,
    alternatives: rankings.slice(1, 4).map(toAlternative)
  };
}

export function rankTasks({ tasks, deadlines, today = getLocalDate(), availableMinutes = 90 }) {
  return tasks
    .filter((task) => PLANNABLE_TASK_STATUSES.includes(task.status))
    .map((task) => scoreTask({ task, deadlines, today, availableMinutes }))
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    });
}

export function scoreTask({ task, deadlines, today, availableMinutes }) {
  const linkedDeadline = findLinkedDeadline(task, deadlines);
  const dueDateScore = task.due_at ? scoreDatePressure(task.due_at, today) : 0;
  const deadlineScore = linkedDeadline ? scoreDeadlinePressure(linkedDeadline, today) : 0;
  const overduePenalty = isOverdue(task.due_at, today) || isOverdue(linkedDeadline?.due_at, today) ? 28 : 0;
  const effortFit = scoreEffortFit(task.estimated_minutes ?? 30, availableMinutes);
  const goalImportance = Number(task.is_north_star) ? 18 : Math.min(Math.round((task.goal_priority ?? 0) / 6), 16);
  const scheduledToday = isSameDate(task.scheduled_start, today) ? 12 : 0;
  const userPriority = task.priority ?? 0;
  const dependencyUnlock = task.parent_task_id ? -6 : 8;

  const score_breakdown = {
    deadline_urgency: Math.max(dueDateScore, deadlineScore),
    user_priority: userPriority,
    effort_fit: effortFit,
    goal_importance: goalImportance,
    overdue_penalty: overduePenalty,
    scheduled_today: scheduledToday,
    dependency_unlock: dependencyUnlock
  };
  const total_score = Object.values(score_breakdown).reduce((sum, value) => sum + value, 0);

  return {
    ...task,
    score: total_score,
    total_score,
    score_breakdown,
    linked_deadline: linkedDeadline
      ? {
          id: linkedDeadline.id,
          title: linkedDeadline.title,
          due_at: linkedDeadline.due_at,
          severity: linkedDeadline.severity
        }
      : null,
    reason: buildReason(task, linkedDeadline, score_breakdown, total_score),
    reason_summary: buildReason(task, linkedDeadline, score_breakdown, total_score),
    risk_summary: buildRisk(task, linkedDeadline, today),
    fit_label: (task.estimated_minutes ?? 30) <= availableMinutes ? "fits current window" : "too large for current window"
  };
}

export function classifyDeadline(deadline, today = getLocalDate()) {
  const delta = daysBetween(today, deadline.due_at);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  if (delta <= 7) return "this_week";
  return "later";
}

export function scoreDeadlinePressure(deadline, today = getLocalDate()) {
  const severity = String(deadline.severity ?? "").toLowerCase();
  const base = severity === "critical" || severity === "high" ? 28 : severity === "important" ? 20 : 12;
  return base + scoreDatePressure(deadline.due_at, today);
}

export function scoreDatePressure(value, today = getLocalDate()) {
  const delta = daysBetween(today, value);
  if (delta < 0) return 42;
  if (delta === 0) return 34;
  if (delta <= 3) return 24;
  if (delta <= 7) return 14;
  return 0;
}

export function getLocalDate(date = new Date()) {
  if (process.env.HELPME_TODAY) {
    return String(process.env.HELPME_TODAY).slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDate(value, date) {
  return typeof value === "string" && value.slice(0, 10) === date;
}

export function daysBetween(startDate, endDate) {
  const start = Date.parse(`${String(startDate).slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${String(endDate).slice(0, 10)}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

function findLinkedDeadline(task, deadlines) {
  return deadlines.find((deadline) => deadline.task_id === task.id) ?? deadlines.find((deadline) => deadline.goal_id === task.goal_id) ?? null;
}

function isOverdue(value, today) {
  return typeof value === "string" && daysBetween(today, value) < 0;
}

function scoreEffortFit(estimatedMinutes, availableMinutes) {
  if (estimatedMinutes <= availableMinutes) return 14;
  if (estimatedMinutes <= availableMinutes + 30) return 2;
  return -12;
}

function buildReason(task, deadline, breakdown, score) {
  const reasons = [];
  if (breakdown.deadline_urgency >= 30) reasons.push("deadline pressure is high");
  if (breakdown.scheduled_today > 0) reasons.push("it is already planned today");
  if (breakdown.goal_importance >= 12) reasons.push("it supports a high-importance goal");
  if (breakdown.effort_fit > 0) reasons.push("it fits the available focus window");
  if (!reasons.length) reasons.push("it has the best combined priority signal");

  const deadlineText = deadline ? ` and is linked to "${deadline.title}"` : "";
  return `${task.title} scores ${score} because ${reasons.join(", ")}${deadlineText}.`;
}

function buildRisk(task, deadline, today) {
  if (isOverdue(task.due_at, today) || isOverdue(deadline?.due_at, today)) {
    return "This work is already overdue; delaying it increases schedule pressure.";
  }

  if (deadline && daysBetween(today, deadline.due_at) <= 3) {
    return "This deadline is close, so deferring it may force a rushed plan later.";
  }

  return "If skipped, the plan may drift toward lower-impact work.";
}

function toAlternative(task) {
  return {
    task_id: task.id,
    title: task.title,
    score: task.total_score,
    reason: task.reason_summary
  };
}

export async function generatePlanWithLlm({ tasks, freeWindows, availableMinutes, userMessage, today = getLocalDate() }) {
  const taskListText = tasks
    .slice(0, 10)
    .map((t) => `- ID: "${t.id}", Title: "${t.title}", Score: ${t.score}, Duration: ${t.estimated_minutes || 30}m, Goal: "${t.goal_title || "None"}", Reason: "${t.reason}"`)
    .join("\n");

  const windowsText = freeWindows
    .map((w) => `- ${w.start.slice(11, 16)} to ${w.end.slice(11, 16)} (${w.minutes} minutes)`)
    .join("\n");

  const totalOpenMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 30), 0);

  const prompt = [
    "You are the Daily Planner AI for HelpMe, a personal operating system.",
    "Your job is to select the best tasks to schedule for today from a list of prioritized tasks, fitting the available focus windows.",
    "Analyze the available windows, task scores/urgency, and the user's special instructions (if any) to decide which tasks to do today.",
    "",
    `Today's Date: ${today}`,
    `User Request: "${userMessage}"`,
    `Total Available Focus Time: ${availableMinutes} minutes`,
    `Available Focus Windows today:`,
    windowsText,
    "",
    `Prioritized Task List (Top 10):`,
    taskListText,
    "",
    `Overload Stats:`,
    `- Total estimated minutes for ALL open tasks: ${totalOpenMinutes} minutes`,
    `- Available focus minutes: ${availableMinutes} minutes`,
    `- Overloaded: ${totalOpenMinutes > availableMinutes ? "YES" : "NO"}`,
    "",
    "Rules:",
    "1. Select a subset of task IDs from the prioritized list that fit within the available focus time.",
    "2. If overloaded, resolve it by selecting only the most urgent tasks (highest scores) or tasks related to the user request. State how you resolved the overload in overload_resolution_summary.",
    "3. Keep the selected task IDs in your preferred execution order.",
    "4. Return JSON only conforming to the schema.",
    "",
    "Format of JSON output:",
    "{",
    '  "selected_task_ids": ["task_id_1", "task_id_2"],',
    '  "overload_resolved": true,',
    '  "overload_resolution_summary": "Vietnamese explanation of how overload was resolved (e.g., postponed learning task to prioritize critical bug fix)",',
    '  "plan_explanation": "Vietnamese short summary of the plan choices and order (max 2 sentences)"',
    "}"
  ].join("\n");

  const schema = {
    type: "object",
    properties: {
      selected_task_ids: {
        type: "array",
        items: { type: "string" }
      },
      overload_resolved: { type: "boolean" },
      overload_resolution_summary: { type: "string" },
      plan_explanation: { type: "string" }
    },
    required: ["selected_task_ids", "overload_resolved", "overload_resolution_summary", "plan_explanation"]
  };

  const validator = z.object({
    selected_task_ids: z.array(z.string()),
    overload_resolved: z.boolean(),
    overload_resolution_summary: z.string().trim(),
    plan_explanation: z.string().trim()
  });

  const result = await runOllamaJson({
    prompt,
    schema,
    validator,
    timeoutMs: 300000
  });

  if (!result.ok) {
    throw new Error(result.error || "Ollama failed to generate plan candidates.");
  }

  return {
    selected_task_ids: result.value.selected_task_ids,
    overload_resolved: result.value.overload_resolved,
    overload_resolution_summary: result.value.overload_resolution_summary,
    plan_explanation: result.value.plan_explanation,
    run_id: result.run_id
  };
}
