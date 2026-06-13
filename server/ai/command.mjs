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
  rankOpenTasks,
  createActionProposal,
  selectTasks,
  buildCalendarConflictValidation
} from "../db/app-queries.mjs";
import { runOllamaJson } from "./ollama-client.mjs";
import { orchestrateAiCommand } from "./orchestrator.mjs";

export const aiCommandRequestSchema = z.object({
  message: z.string().trim().min(1)
});

// Removed post-hoc planner summary schemas

const intentParserJsonSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: [
        "organize_inbox",
        "plan_day",
        "create_task",
        "reschedule_task",
        "deadline_radar",
        "daily_review",
        "explain_priority",
        "breakdown_task",
        "create_reminder",
        "create_event",
        "create_time_block",
        "bulk_reschedule",
        "fallback"
      ]
    },
    confidence: { type: "number" },
    title: { type: "string" },
    scheduledStart: { type: "string" },
    scheduledEnd: { type: "string" },
    estimatedMinutes: { type: "number" },
    priority: { type: "number" },
    availableStart: { type: "string" },
    availableEnd: { type: "string" },
    location: { type: "string" }
  },
  required: ["intent", "confidence"]
};

const intentParserValidator = z.object({
  intent: z.enum([
    "organize_inbox",
    "plan_day",
    "create_task",
    "reschedule_task",
    "deadline_radar",
    "daily_review",
    "explain_priority",
    "breakdown_task",
    "create_reminder",
    "create_event",
    "create_time_block",
    "bulk_reschedule",
    "fallback"
  ]),
  confidence: z.number().min(0).max(1),
  title: z.string().optional().nullable(),
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  estimatedMinutes: z.number().optional().nullable(),
  priority: z.number().optional().nullable(),
  availableStart: z.string().optional().nullable(),
  availableEnd: z.string().optional().nullable(),
  location: z.string().optional().nullable()
});

export async function handleAiCommand(rawMessage) {
  return orchestrateAiCommand({
    rawMessage,
    execute: executeAiCommand
  });
}

async function parseIntentWithLlm(message) {
  const today = getTodayDate();
  const prompt = [
    "You are the intent parser for HelpMe, a calm local-first personal operating system.",
    "Analyze the user's command in Vietnamese or English and extract the intent and fields.",
    "Return JSON only conforming to the schema.",
    "",
    `Today is: ${today} (Timezone UTC+07:00, Vietnam Standard Time)`,
    "",
    "Allowed Intents:",
    "- organize_inbox: user wants to group, sort, clean up, or organize inbox tasks (e.g. \"sắp xếp việc rời rạc\", \"organize inbox\").",
    "- plan_day: user wants to plan the day or schedule time slots (e.g. \"lên kế hoạch\", \"xếp lịch 20h đến 23h\"). Extract availableStart (default \"20:00\") and availableEnd (default \"23:00\").",
    "- create_task: user wants to add/create a new task or set a reminder (e.g. \"nhắc tôi 20h học AWS 1h\").",
    "  Extract:",
    "  * title: clean description of the task (exclude verbs like nhac toi/them/tao, and exclude dates/times/durations).",
    "  * scheduledStart: resolve relative to today (e.g., \"ngày mai 8:30\" becomes \"2026-06-09T08:30:00+07:00\").",
    "  * estimatedMinutes: task duration (e.g., \"1h\"/\"1 tieng\" -> 60, \"30 phut\" -> 30, default is 60).",
    "  * priority: 90 if user mentions \"gấp\", \"khẩn cấp\", \"urgent\", \"quan trọng\", otherwise 55.",
    "- reschedule_task: user wants to move, reschedule, or change time of a task (e.g. \"move sang ngày mai 8:30h\"). Extract scheduledStart.",
    "- deadline_radar: user asks about deadlines, due dates, or overdue work (e.g. \"hạn chót\", \"deadline\", \"quá hạn\").",
    "- daily_review: user wants to review their day, reflect, or summarize completed work (e.g. \"review cuối ngày\", \"tổng kết\").",
    "- explain_priority: user asks why a task is prioritized or what to do next.",
    "- breakdown_task: user wants to split, divide, or break down a task (e.g. \"chia nhỏ task học AWS\", \"breakdown task AWS\"). Extract title (the name of the task to be broken down).",
    "- create_reminder: user wants to create/set a simple reminder or notification (e.g. \"nhắc tôi uống nước sau 15 phút\", \"nhắc tôi gọi điện cho mẹ\"). Extract title and scheduledStart (the time to remind, e.g. \"2026-06-08T10:00:00+07:00\").",
    "- create_event: user wants to add a calendar event or meeting (e.g. \"thêm sự kiện họp nhóm ngày mai 9h đến 10h\", \"tạo event meeting 14:00-15:00\"). Extract title, scheduledStart, scheduledEnd, and location if mentioned.",
    "- create_time_block: user wants to block time for focused work (e.g. \"block 2 tiếng học AWS tối nay\", \"đặt khung giờ 20h-22h để code\"). Extract title, scheduledStart, scheduledEnd or estimatedMinutes.",
    "- bulk_reschedule: user wants to move multiple non-urgent/unfinished tasks to another day (e.g. \"dời các task không gấp sang ngày mai\", \"chuyển hết task chưa xong sang mai\").",
    "- fallback: command is empty, unclear, or does not match any other intent.",
    "",
    `User command: "${message}"`
  ].join("\n");

  const result = await runOllamaJson({
    prompt,
    schema: intentParserJsonSchema,
    validator: intentParserValidator,
    timeoutMs: 4000
  });

  if (!result.ok) {
    throw new Error(result.error || "Ollama failed to parse intent.");
  }

  return result.value;
}

async function executeAiCommand({ message, normalized }) {
  let parsed;
  try {
    parsed = await parseIntentWithLlm(message);
  } catch (error) {
    return readOnlyAnswer(
      "fallback",
      "Hệ thống AI cục bộ đang ngoại tuyến hoặc phản hồi chậm. Bạn có thể sử dụng các màn hình trực tiếp để quản lý công việc.",
      { error: error.message }
    );
  }

  if (parsed.confidence < 0.5 || parsed.intent === "fallback") {
    return readOnlyAnswer(
      "fallback",
      "Tôi không hiểu rõ câu lệnh của bạn. Bạn có thể làm rõ hoặc viết lại câu lệnh được không? (Ví dụ: 'nhắc tôi ngày mai 8:30 học bài')",
      { intent: parsed.intent, confidence: parsed.confidence }
    );
  }

  if (parsed.intent === "organize_inbox") {
    const { actions, groups, proposal } = organizeInboxIntoProposal();
    return {
      mode: "proposal",
      intent: "organize_inbox",
      answer: "I grouped the inbox into goal/project lanes. I will only write these changes after confirmation.",
      proposal,
      related_context: { actions, groups }
    };
  }

  if (parsed.intent === "plan_day") {
    const window = {
      availableStart: parsed.availableStart || "20:00",
      availableEnd: parsed.availableEnd || "23:00"
    };
    const { blocks, proposal, validation, explanation, overload_resolution_summary, ai } = await createPlanDayProposal({
      ...window,
      userMessage: message
    });

    return {
      mode: "proposal",
      intent: "plan_day",
      answer: explanation ?? `Tôi đã lập kế hoạch cho buổi tối hôm nay (${window.availableStart} - ${window.availableEnd}).`,
      proposal,
      related_context: {
        blocks,
        validation,
        reason: overload_resolution_summary ?? "Hệ thống tự động sắp xếp dựa trên độ ưu tiên và thời hạn.",
        ai
      }
    };
  }

  if (parsed.intent === "create_task") {
    const wantsReminder = normalized.includes("nhac toi") || normalized.includes("nhac nho") || normalized.includes("remind") || normalized.includes("nhac");
    const params = {
      title: parsed.title || "New task",
      dueAt: parsed.scheduledStart || null,
      scheduledStart: parsed.scheduledStart || null,
      estimatedMinutes: parsed.estimatedMinutes || 60,
      priority: parsed.priority || 55,
      create_reminder: wantsReminder
    };
    const proposal = createTaskProposal(params);
    const conflictCount = proposal.payload.validation?.conflict_count ?? 0;

    return {
      mode: "proposal",
      intent: "create_task",
      answer: conflictCount
        ? `I understood the task, but the requested time has ${conflictCount} calendar conflict${conflictCount === 1 ? "" : "s"}. I will not write it unless validation passes.`
        : "I understood the new task. I will only add it to SQLite after confirmation.",
      proposal,
      related_context: params
    };
  }

  if (parsed.intent === "create_reminder") {
    const remindAt = parsed.scheduledStart || new Date().toISOString();
    const title = parsed.title || "Nhắc nhở";
    const payload = {
      title,
      remind_at: remindAt
    };
    const proposal = createActionProposal({
      intent: "create_reminder",
      title: `Nhắc nhở: ${title}`,
      summary: `Đặt nhắc nhở "${title}" vào lúc ${remindAt.replace("T", " ").slice(0, 16)}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_reminder",
      answer: `Tôi đã chuẩn bị đề xuất đặt nhắc nhở "${title}" vào lúc ${remindAt.replace("T", " ").slice(0, 16)}. Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "create_event") {
    const title = parsed.title || "Sự kiện mới";
    const startAt = parsed.scheduledStart || `${getTodayDate()}T20:00:00+07:00`;
    const endAt = parsed.scheduledEnd || addMinutesIso(startAt, parsed.estimatedMinutes || 60);
    const location = parsed.location || null;

    const validation = buildCalendarConflictValidation({ startAt, endAt });
    const payload = {
      title,
      start_at: startAt,
      end_at: endAt,
      location,
      source: "ai_generated",
      validation
    };

    const proposal = createActionProposal({
      intent: "create_event",
      title: `Tạo sự kiện: ${title}`,
      summary: validation.conflict_count > 0
        ? `Sự kiện "${title}" trùng lịch với ${validation.conflict_count} mục khác.`
        : `Tạo sự kiện "${title}" từ ${startAt.replace("T", " ").slice(0, 16)} đến ${endAt.replace("T", " ").slice(0, 16)}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_event",
      answer: validation.conflict_count > 0
        ? `Sự kiện "${title}" trùng lịch với ${validation.conflict_count} mục khác. Hãy xác nhận nếu muốn tiếp tục.`
        : `Tôi đã chuẩn bị đề xuất tạo sự kiện "${title}". Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "create_time_block") {
    const title = parsed.title || "Khung giờ tập trung";
    const startAt = parsed.scheduledStart || `${getTodayDate()}T20:00:00+07:00`;
    const endAt = parsed.scheduledEnd || addMinutesIso(startAt, parsed.estimatedMinutes || 60);

    const validation = buildCalendarConflictValidation({ startAt, endAt });
    const payload = {
      title,
      start_at: startAt,
      end_at: endAt,
      type: "task",
      status: "planned",
      validation
    };

    const proposal = createActionProposal({
      intent: "create_time_block",
      title: `Tạo khung giờ: ${title}`,
      summary: validation.conflict_count > 0
        ? `Khung giờ "${title}" trùng lịch với ${validation.conflict_count} mục khác.`
        : `Tạo khung giờ "${title}" từ ${startAt.replace("T", " ").slice(0, 16)} đến ${endAt.replace("T", " ").slice(0, 16)}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_time_block",
      answer: validation.conflict_count > 0
        ? `Khung giờ "${title}" trùng lịch với ${validation.conflict_count} mục khác. Hãy xác nhận nếu muốn tiếp tục.`
        : `Tôi đã chuẩn bị đề xuất tạo khung giờ "${title}". Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "bulk_reschedule") {
    const today = getTodayDate();
    const tomorrow = addDays(today, 1);
    const allTasks = selectTasks();
    const ACTIVE = ["inbox", "todo", "doing", "in_focus", "open"];
    const todayTasks = allTasks.filter(
      (t) => ACTIVE.includes(t.status) && (
        (t.scheduled_start && t.scheduled_start.slice(0, 10) === today) ||
        (t.due_at && t.due_at.slice(0, 10) === today)
      )
    );

    // Classify: urgent = priority >= 70 or due today, non-urgent = rest
    const urgent = [];
    const nonUrgent = [];
    for (const task of todayTasks) {
      const isDueToday = task.due_at && task.due_at.slice(0, 10) === today;
      if (task.priority >= 70 || isDueToday) {
        urgent.push(task);
      } else {
        nonUrgent.push(task);
      }
    }

    if (nonUrgent.length === 0) {
      return readOnlyAnswer(
        "bulk_reschedule",
        "Không có task nào đủ điều kiện dời sang ngày mai. Tất cả task hôm nay đều khẩn cấp hoặc có deadline hôm nay.",
        { urgent_count: urgent.length, non_urgent_count: 0 }
      );
    }

    const rescheduleItems = nonUrgent.map((task) => ({
      task_id: task.id,
      title: task.title,
      scheduled_start: `${tomorrow}T20:00:00+07:00`,
      scheduled_end: `${tomorrow}T${minutesToTime(timeToMinutes("20:00") + (task.estimated_minutes || 30))}:00+07:00`,
      estimated_minutes: task.estimated_minutes || 30,
      reason: `Priority ${task.priority} — không gấp, dời sang ngày mai.`
    }));

    const proposal = createActionProposal({
      intent: "bulk_reschedule",
      title: `Dời ${nonUrgent.length} task không gấp sang ngày mai`,
      summary: `Giữ lại ${urgent.length} task khẩn cấp, dời ${nonUrgent.length} task sang ${tomorrow}.`,
      payload: {
        keep_today: urgent.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
        reschedule: rescheduleItems,
        target_date: tomorrow
      }
    });

    return {
      mode: "proposal",
      intent: "bulk_reschedule",
      answer: `Tôi sẽ giữ lại ${urgent.length} task khẩn cấp và dời ${nonUrgent.length} task không gấp sang ngày mai. Hãy xác nhận bên dưới.`,
      proposal,
      related_context: {
        urgent_count: urgent.length,
        non_urgent_count: nonUrgent.length,
        keep_today: urgent.map((t) => t.title),
        move_tomorrow: nonUrgent.map((t) => t.title)
      }
    };
  }

  if (parsed.intent === "reschedule_task") {
    const focus = getTodayView().suggested_focus;
    if (!focus) {
      return readOnlyAnswer("reschedule_task", "I could not find a suitable task to reschedule.", {});
    }

    const scheduledStart = parsed.scheduledStart || `${addDays(getTodayDate(), 1)}T20:00:00+07:00`;
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

  if (parsed.intent === "deadline_radar") {
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

  if (parsed.intent === "daily_review") {
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

  if (parsed.intent === "explain_priority") {
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

// Post-hoc enrichment helpers removed

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getTodayDate() {
  if (process.env.HELPME_TODAY) {
    return String(process.env.HELPME_TODAY).slice(0, 10);
  }

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

function addMinutesIso(value, minutes) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
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
