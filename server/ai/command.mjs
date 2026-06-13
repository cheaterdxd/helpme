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
  buildCalendarConflictValidation,
  getGoalsOverview
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
        "create_deadline",
        "explain_deadline",
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
    location: { type: "string" },
    severity: { type: "string" }
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
    "create_deadline",
    "explain_deadline",
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
  location: z.string().optional().nullable(),
  severity: z.string().optional().nullable()
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
    "- create_deadline: user wants to add/create a new deadline (e.g. \"hạn chót nộp báo cáo là thứ sáu tuần sau lúc 17h\", \"set deadline học AWS ngày mai\"). Extract title, scheduledStart (as the due date/time, e.g. \"2026-06-19T17:00:00+07:00\"), and severity (\"high\" if they mention \"gấp\"/\"quan trọng\"/\"khẩn cấp\", otherwise \"medium\").",
    "- explain_deadline: user wants to explain, analyze, or detail deadlines or their scheduling pressure (e.g. \"giải thích các hạn chót của tôi\", \"tại sao deadline này gấp\").",
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

  if (parsed.intent === "create_deadline") {
    const dueAt = parsed.scheduledStart || `${getTodayDate()}T23:59:59+07:00`;
    const title = parsed.title || "Hạn chót mới";
    const severity = parsed.severity || "medium";

    const allTasks = selectTasks();
    const goalsOverview = getGoalsOverview();
    const allProjects = goalsOverview.flatMap((g) => g.projects || []);

    let goalId = null;
    let projectId = null;
    let taskId = null;
    let linkedName = null;
    let linkedType = null;

    const searchWords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matchedTask = allTasks.find((t) =>
      searchWords.some((w) => t.title.toLowerCase().includes(w))
    );
    if (matchedTask) {
      taskId = matchedTask.id;
      linkedName = matchedTask.title;
      linkedType = "task";
      goalId = matchedTask.goalId || null;
      projectId = matchedTask.projectId || null;
    } else {
      const matchedProj = allProjects.find((p) =>
        searchWords.some((w) => p.title.toLowerCase().includes(w))
      );
      if (matchedProj) {
        projectId = matchedProj.id;
        linkedName = matchedProj.title;
        linkedType = "project";
        goalId = matchedProj.goalId || null;
      } else {
        const matchedGoal = goalsOverview.find((g) =>
          searchWords.some((w) => g.title.toLowerCase().includes(w))
        );
        if (matchedGoal) {
          goalId = matchedGoal.id;
          linkedName = matchedGoal.title;
          linkedType = "goal";
        }
      }
    }

    const payload = {
      title,
      due_at: dueAt,
      severity,
      status: "active",
      goal_id: goalId,
      project_id: projectId,
      task_id: taskId
    };

    const linkedSummary = linkedName ? ` (Liên kết ${linkedType}: "${linkedName}")` : "";
    const proposal = createActionProposal({
      intent: "create_deadline",
      title: `Tạo deadline: ${title}`,
      summary: `Hạn chót: ${dueAt.replace("T", " ").slice(0, 16)} · Mức độ: ${severity}${linkedSummary}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_deadline",
      answer: `Tôi đã chuẩn bị đề xuất tạo deadline "${title}" vào lúc ${dueAt.replace("T", " ").slice(0, 16)}${linkedSummary}. Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "explain_deadline" || parsed.intent === "deadline_radar") {
    const radar = getDeadlineRadar();
    const today = getTodayDate();

    const overdueList = radar.overdue.map((d) => `- Overdue: "${d.title}" (Due: ${d.due_at.slice(0, 10)}, Severity: ${d.severity})`).join("\n");
    const todayList = radar.today.map((d) => `- Today: "${d.title}" (Severity: ${d.severity})`).join("\n");
    const weekList = radar.this_week.map((d) => `- This Week: "${d.title}" (Due: ${d.due_at.slice(0, 10)}, Severity: ${d.severity})`).join("\n");
    const laterList = radar.later.map((d) => `- Later: "${d.title}" (Due: ${d.due_at.slice(0, 10)})`).join("\n");

    const prompt = [
      "You are the Deadline Advisor for HelpMe.",
      `Today's date is: ${today}`,
      "Here is the list of active deadlines grouped by urgency:",
      overdueList || "- No overdue deadlines",
      todayList || "- No deadlines due today",
      weekList || "- No deadlines due this week",
      laterList || "- No later deadlines",
      "",
      "Explain the deadline pressure to the user in Vietnamese in a calm, clear, and reassuring tone.",
      "Summarize which deadlines need immediate action (overdue/today), what the overall risk is, and what they should focus on first.",
      "Keep it brief (3-4 sentences maximum). Do not repeat the dates, just outline the priorities."
    ].join("\n");

    let explanation = "Tôi không thể kết nối với AI để phân tích deadline lúc này.";
    try {
      const result = await runOllamaJson({
        prompt,
        schema: {
          type: "object",
          properties: {
            explanation: { type: "string" }
          },
          required: ["explanation"]
        },
        validator: z.object({
          explanation: z.string().trim()
        }),
        timeoutMs: 4000
      });
      if (result.ok) {
        explanation = result.value.explanation;
      }
    } catch (e) {
      const overdueCount = radar.overdue.length;
      const todayCount = radar.today.length;
      if (overdueCount || todayCount) {
        explanation = `Bạn đang có ${overdueCount} hạn chót quá hạn và ${todayCount} hạn chót trong hôm nay cần được giải quyết ngay để tránh ảnh hưởng đến tiến độ công việc.`;
      } else {
        explanation = "Hạn chót của bạn hiện tại đang ở trạng thái an toàn. Không có mục nào quá hạn hoặc khẩn cấp trong ngày hôm nay.";
      }
    }

    return readOnlyAnswer(
      parsed.intent,
      explanation,
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
