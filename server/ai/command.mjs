import { z } from "zod";
import {
  createDailyReviewProposal,
  createPlanDayProposal,
  createRescheduleProposal,
  createTaskProposal,
  getDeadlineRadar,
  getReviewSummary,
  getTodayView,
  organizeInboxIntoProposal,
  rankOpenTasks
} from "../db/app-queries.mjs";
import { runOllamaJson } from "./ollama-client.mjs";

export const aiCommandRequestSchema = z.object({
  message: z.string().trim().min(1)
});

const plannerSummaryJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    reason: { type: "string" }
  },
  required: ["summary", "reason"]
};

const plannerSummaryValidator = z.object({
  summary: z.string().trim().min(1).max(280),
  reason: z.string().trim().min(1).max(320)
});

export async function handleAiCommand(rawMessage) {
  const message = rawMessage.trim();
  const normalized = normalize(message);

  if (looksLikeInboxCommand(normalized)) {
    const { actions, groups, proposal } = organizeInboxIntoProposal();
    return {
      mode: "proposal",
      intent: "organize_inbox",
      answer: "I grouped the inbox into goal/project lanes. I will only write these changes after confirmation.",
      proposal,
      related_context: { actions, groups }
    };
  }

  if (looksLikePlanDayCommand(normalized)) {
    const window = parseTimeWindow(message);
    const { blocks, proposal, validation } = createPlanDayProposal(window);
    const enriched = await enrichPlanSummary(message, blocks);

    return {
      mode: "proposal",
      intent: "plan_day",
      answer: enriched.summary ?? `I prepared a plan for ${window.availableStart}-${window.availableEnd}.`,
      proposal,
      related_context: {
        blocks,
        validation,
        reason: enriched.reason ?? "Rule-based planner selected tasks by deadline, priority, and effort.",
        ai: enriched.ai
      }
    };
  }

  if (looksLikeCreateTaskCommand(normalized)) {
    const parsed = parseCreateTask(message);
    const proposal = createTaskProposal(parsed);
    const conflictCount = proposal.payload.validation?.conflict_count ?? 0;

    return {
      mode: "proposal",
      intent: "create_task",
      answer: conflictCount
        ? `I understood the task, but the requested time has ${conflictCount} calendar conflict${conflictCount === 1 ? "" : "s"}. I will not write it unless validation passes.`
        : "I understood the new task. I will only add it to SQLite after confirmation.",
      proposal,
      related_context: parsed
    };
  }

  if (looksLikeRescheduleCommand(normalized)) {
    const focus = getTodayView().suggested_focus;
    if (!focus) {
      return readOnlyAnswer("reschedule_task", "I could not find a suitable task to reschedule.", {});
    }

    const scheduledStart = parseRelativeTomorrowAt(message) ?? `${addDays(getTodayDate(), 1)}T20:00:00+07:00`;
    const proposal = createRescheduleProposal({
      taskId: focus.task_id,
      scheduledStart,
      estimatedMinutes: focus.duration_minutes
    });
    const conflictCount = proposal.payload.validation?.conflict_count ?? 0;

    return {
      mode: "proposal",
      intent: "reschedule_task",
      answer: conflictCount
        ? `I prepared the reschedule, but the requested time has ${conflictCount} calendar conflict${conflictCount === 1 ? "" : "s"}. I will not write it unless validation passes.`
        : "I prepared a reschedule proposal. I will only update the calendar after confirmation.",
      proposal,
      related_context: { task_id: focus.task_id, scheduled_start: scheduledStart }
    };
  }

  if (looksLikeDeadlineQuestion(normalized)) {
    const radar = getDeadlineRadar();
    const urgentCount = radar.overdue.length + radar.today.length;
    return readOnlyAnswer(
      "deadline_radar",
      urgentCount
        ? `There are ${urgentCount} deadline items that need attention now.`
        : "There is no deadline that needs immediate action today.",
      radar
    );
  }

  if (looksLikeReviewCommand(normalized)) {
    const review = getReviewSummary();
    const proposal = createDailyReviewProposal();

    return {
      mode: "proposal",
      intent: "daily_review",
      answer: review.summary,
      proposal,
      related_context: review
    };
  }

  const focus = rankOpenTasks()[0];
  if (focus) {
    return readOnlyAnswer(
      "explain_priority",
      `I am prioritizing "${focus.title}" because it scores ${focus.score}: ${focus.reason}`,
      {
        task_id: focus.id,
        score: focus.score,
        score_breakdown: focus.score_breakdown,
        reason: focus.reason,
        risk: focus.risk_summary
      }
    );
  }

  return readOnlyAnswer("fallback", "I do not have enough context to recommend a next action yet.", {});
}

function readOnlyAnswer(intent, answer, relatedContext) {
  return {
    mode: "answer",
    intent,
    answer,
    related_context: relatedContext,
    suggested_actions: []
  };
}

function looksLikeInboxCommand(value) {
  return value.includes("inbox") || value.includes("organize") || value.includes("sap xep viec roi rac");
}

function looksLikePlanDayCommand(value) {
  return value.includes("plan") || value.includes("ke hoach") || value.includes("sap lich") || value.includes("xep lich");
}

function looksLikeCreateTaskCommand(value) {
  return value.includes("nhac toi") || value.includes("them task") || value.includes("tao task") || value.includes("add task");
}

function looksLikeRescheduleCommand(value) {
  return value.includes("doi") || value.includes("reschedule") || value.includes("move") || value.includes("sang ngay mai");
}

function looksLikeDeadlineQuestion(value) {
  return value.includes("deadline") || value.includes("han") || value.includes("qua han");
}

function looksLikeReviewCommand(value) {
  return value.includes("review") || value.includes("cuoi ngay") || value.includes("tong ket");
}

function parseCreateTask(message) {
  const normalized = normalize(message);
  const time = parseFirstTime(message);
  const duration = parseDurationMinutes(message) ?? 60;
  const date = normalized.includes("ngay mai") || normalized.includes("tomorrow") ? addDays(getTodayDate(), 1) : getTodayDate();
  const scheduledStart = time ? `${date}T${time}:00+07:00` : null;
  const cleanedTitle = message
    .replace(/nhac toi|them task|tao task|add task/gi, "")
    .replace(/toi mai|ngay mai|tomorrow/gi, "")
    .replace(/luc|at/gi, "")
    .replace(/\d{1,2}(:\d{2})?\s*h?/gi, "")
    .replace(/trong\s+\d+\s*(phut|gio|tieng|h)/gi, "")
    .trim();

  return {
    title: cleanedTitle || "New task",
    dueAt: scheduledStart,
    scheduledStart,
    estimatedMinutes: duration,
    priority: normalized.includes("gap") || normalized.includes("urgent") ? 90 : 55
  };
}

function parseTimeWindow(message) {
  const matches = [...message.matchAll(/(\d{1,2})(?::(\d{2}))?\s*h?/gi)].map((match) => {
    const hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  });

  if (matches.length >= 2) {
    return {
      availableStart: matches[0],
      availableEnd: matches[1]
    };
  }

  return {
    availableStart: "20:00",
    availableEnd: "23:00"
  };
}

function parseFirstTime(message) {
  const match = message.match(/(\d{1,2})(?::(\d{2}))?\s*h?/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseDurationMinutes(message) {
  const hourMatch = message.match(/(\d+)\s*(gio|tieng|h)\b/i);
  if (hourMatch) return Number(hourMatch[1]) * 60;

  const minuteMatch = message.match(/(\d+)\s*(phut|m)\b/i);
  if (minuteMatch) return Number(minuteMatch[1]);

  return null;
}

function parseRelativeTomorrowAt(message) {
  const time = parseFirstTime(message);
  if (!time) return null;
  return `${addDays(getTodayDate(), 1)}T${time}:00+07:00`;
}

async function enrichPlanSummary(message, blocks) {
  const prompt = [
    "Return JSON only.",
    "You are HelpMe, a calm local-first personal operating system.",
    "Summarize this daily plan in Vietnamese without chain-of-thought.",
    `User request: ${message}`,
    `Blocks: ${JSON.stringify(blocks)}`
  ].join("\n");

  const result = await runOllamaJson({
    prompt,
    schema: plannerSummaryJsonSchema,
    validator: plannerSummaryValidator,
    timeoutMs: 2500
  });

  if (!result.ok) {
    return {
      summary: null,
      reason: null,
      ai: buildFallbackAiMeta(result.error, result.run_id)
    };
  }

  return {
    summary: result.value.summary,
    reason: result.value.reason,
    ai: {
      provider: "ollama",
      used_fallback: false,
      run_id: result.run_id
    }
  };
}

function buildFallbackAiMeta(error, runId = null) {
  return {
    provider: "rule-based",
    used_fallback: true,
    fallback_reason: error ?? "Ollama did not return a valid planner summary.",
    run_id: runId
  };
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}
