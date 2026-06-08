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

const plannerSummarySchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    reason: { type: "string" }
  },
  required: ["summary", "reason"]
};

export async function handleAiCommand(rawMessage) {
  const message = rawMessage.trim();
  const normalized = normalize(message);

  if (looksLikeInboxCommand(normalized)) {
    const { groups, proposal } = organizeInboxIntoProposal();
    return {
      mode: "proposal",
      intent: "organize_inbox",
      answer: "Tôi đã phân nhóm inbox. Xác nhận thì tôi mới chuyển các task ra khỏi inbox.",
      proposal,
      related_context: { groups }
    };
  }

  if (looksLikePlanDayCommand(normalized)) {
    const window = parseTimeWindow(message);
    const { blocks, proposal } = createPlanDayProposal(window);
    const enriched = await enrichPlanSummary(message, blocks);

    return {
      mode: "proposal",
      intent: "plan_day",
      answer: enriched?.summary ?? `Tôi đã tạo một kế hoạch trong khung ${window.availableStart}-${window.availableEnd}.`,
      proposal,
      related_context: {
        blocks,
        reason: enriched?.reason ?? "Rule-based planner chọn task theo deadline, priority và effort."
      }
    };
  }

  if (looksLikeCreateTaskCommand(normalized)) {
    const parsed = parseCreateTask(message);
    const proposal = createTaskProposal(parsed);

    return {
      mode: "proposal",
      intent: "create_task",
      answer: "Tôi đã hiểu task mới. Xác nhận thì tôi mới thêm vào SQLite.",
      proposal,
      related_context: parsed
    };
  }

  if (looksLikeRescheduleCommand(normalized)) {
    const focus = getTodayView().suggested_focus;
    if (!focus) {
      return readOnlyAnswer("reschedule_task", "Tôi chưa tìm thấy task phù hợp để dời.", {});
    }

    const scheduledStart = parseRelativeTomorrowAt(message) ?? `${addDays(getTodayDate(), 1)}T20:00:00+07:00`;
    const proposal = createRescheduleProposal({
      taskId: focus.task_id,
      scheduledStart,
      estimatedMinutes: focus.duration_minutes
    });

    return {
      mode: "proposal",
      intent: "reschedule_task",
      answer: "Tôi đã chuẩn bị đề xuất dời task ưu tiên. Xác nhận thì tôi mới cập nhật lịch.",
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
        ? `Có ${urgentCount} deadline cần chú ý ngay. Tôi đã nhóm theo quá hạn, hôm nay, tuần này và sau đó.`
        : "Chưa có deadline nào cần xử lý ngay hôm nay.",
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
      `Tôi đang ưu tiên "${focus.title}" vì nó có điểm ${focus.score}: ${focus.reason}`,
      {
        task_id: focus.id,
        score: focus.score,
        reason: focus.reason
      }
    );
  }

  return readOnlyAnswer("fallback", "Tôi chưa đủ dữ liệu để đề xuất hành động tiếp theo.", {});
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
    .replace(/nhac toi|nhắc tôi|them task|thêm task|tao task|tạo task|add task/gi, "")
    .replace(/toi mai|tối mai|ngay mai|ngày mai|tomorrow/gi, "")
    .replace(/luc|lúc|at/gi, "")
    .replace(/\d{1,2}(:\d{2})?\s*h?/gi, "")
    .replace(/trong\s+\d+\s*(phut|phút|gio|giờ|tieng|tiếng|h)/gi, "")
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
  const hourMatch = message.match(/(\d+)\s*(gio|giờ|tieng|tiếng|h)\b/i);
  if (hourMatch) return Number(hourMatch[1]) * 60;

  const minuteMatch = message.match(/(\d+)\s*(phut|phút|m)\b/i);
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
    schema: plannerSummarySchema,
    timeoutMs: 2500
  });

  if (!result.ok || typeof result.value?.summary !== "string") {
    return null;
  }

  return {
    summary: result.value.summary,
    reason: typeof result.value.reason === "string" ? result.value.reason : ""
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
