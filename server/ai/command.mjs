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
  getGoalsOverview,
  getHabitDashboard
} from "../db/app-queries.mjs";
import { runOllamaJson } from "./ollama-client.mjs";
import { orchestrateAiCommand } from "./orchestrator.mjs";
import { sqlite } from "../db/client.mjs";

export const aiCommandRequestSchema = z.object({
  message: z.string().trim().min(1)
});

// Removed post-hoc planner summary schemas

const intentParserJsonSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: [
        "create",
        "list",
        "search",
        "delete",
        "edit",
        "schedule",
        "statistics",
        "breakdown",
        "explain",
        "check",
        "organize",
        "fallback"
      ]
    },
    object: {
      type: "string",
      enum: [
        "goal",
        "project",
        "task",
        "tasks",
        "reminder",
        "event",
        "time_block",
        "deadline",
        "routine",
        "inbox",
        "day_plan",
        "daily_review",
        "brief",
        "progress",
        "priority",
        "habit",
        "habits",
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
    severity: { type: "string" },
    items: { type: "array", items: { type: "string" } },
    parentName: { type: "string" },
    parentType: { type: "string", enum: ["goal", "project"] }
  },
  required: ["action", "object", "confidence"]
};

const intentParserValidator = z.object({
  action: z.enum([
    "create",
    "list",
    "search",
    "delete",
    "edit",
    "schedule",
    "statistics",
    "breakdown",
    "explain",
    "check",
    "organize",
    "fallback"
  ]),
  object: z.enum([
    "goal",
    "project",
    "task",
    "tasks",
    "reminder",
    "event",
    "time_block",
    "deadline",
    "routine",
    "inbox",
    "day_plan",
    "daily_review",
    "brief",
    "progress",
    "priority",
    "habit",
    "habits",
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
  severity: z.string().optional().nullable(),
  items: z.array(z.string()).optional().nullable(),
  parentName: z.string().optional().nullable(),
  parentType: z.enum(["goal", "project"]).optional().nullable()
});

export function mapActionObjectToIntent(action, object) {
  if (action === "organize" && object === "inbox") return "organize_inbox";
  if (action === "schedule" && object === "day_plan") return "plan_day";
  if (action === "create" && object === "task") return "create_task";
  if (action === "create" && object === "reminder") return "create_reminder";
  if (action === "create" && object === "event") return "create_event";
  if (action === "create" && object === "time_block") return "create_time_block";
  if (action === "schedule" && object === "task") return "reschedule_task";
  if (action === "list" && object === "deadline") return "deadline_radar";
  if (action === "statistics" && object === "daily_review") return "daily_review";
  if (action === "explain" && object === "priority") return "explain_priority";
  if (action === "breakdown" && object === "task") return "breakdown_task";
  if (action === "create" && object === "deadline") return "create_deadline";
  if (action === "explain" && object === "deadline") return "explain_deadline";

  // New ones for Goals, Projects, Habits:
  if (action === "create" && object === "goal") return "create_goal";
  if (action === "create" && object === "project") return "create_project";
  if (action === "create" && (object === "habit" || object === "habits" || object === "routine")) return "create_habit";
  if (action === "breakdown" && object === "goal") return "breakdown_goal";
  
  if (action === "list" && (object === "goal" || object === "goals")) return "list_goals";
  if (action === "list" && (object === "project" || object === "projects")) return "list_projects";
  if (action === "list" && (object === "task" || object === "tasks")) return "list_tasks";
  if (action === "list" && (object === "habit" || object === "habits")) return "list_habits";

  return "fallback";
}

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
    "Analyze the user's command in Vietnamese or English and extract the action, object, and fields.",
    "Return JSON only conforming to the schema.",
    "",
    `Today is: ${today} (Timezone UTC+07:00, Vietnam Standard Time)`,
    "",
    "Allowed Actions:",
    "- create: user wants to add, create, set a new item.",
    "- list: user wants to view, list, show items (goals, projects, tasks, habits, deadlines).",
    "- breakdown: user wants to split, divide, or break down a task or goal.",
    "- schedule: user wants to move, reschedule, plan, or allocate time slots.",
    "- organize: user wants to group, sort, clean up, or organize.",
    "- statistics: user wants to reflection, reflection review or summaries.",
    "- explain: user wants to know why something is prioritized or analysis.",
    "- fallback: action is unclear or empty.",
    "",
    "Allowed Objects:",
    "- inbox: inbox tasks or files.",
    "- day_plan: daily planner / scheduling slots.",
    "- task / tasks: work items, todos.",
    "- reminder: simple remind notification.",
    "- event: calendar event / meeting.",
    "- time_block: focus block.",
    "- deadline: due dates.",
    "- daily_review: end-of-day summary / reflection.",
    "- priority: task focus / prioritization logic.",
    "- goal: high-level aspiration / target.",
    "- project: linked container for tasks.",
    "- habit / habits: recurring behavior.",
    "- fallback: object is unclear.",
    "",
    "Examples:",
    "- \"organize inbox\": { \"action\": \"organize\", \"object\": \"inbox\", \"confidence\": 0.95 }",
    "- \"nhắc tôi 20h học AWS 1h\": { \"action\": \"create\", \"object\": \"task\", \"confidence\": 0.95, \"title\": \"hoc AWS\", \"scheduledStart\": \"2026-06-08T20:00:00+07:00\", \"estimatedMinutes\": 60 }",
    "- \"tạo goals mới: học dọn dẹp nhà cửa\": { \"action\": \"create\", \"object\": \"goal\", \"confidence\": 0.95, \"title\": \"học dọn dẹp nhà cửa\" }",
    "- \"thêm thói quen chạy bộ hàng ngày\": { \"action\": \"create\", \"object\": \"habit\", \"confidence\": 0.95, \"title\": \"chạy bộ hàng ngày\" }",
    "- \"evening review\": { \"action\": \"statistics\", \"object\": \"daily_review\", \"confidence\": 0.95 }",
    "- \"liệt kê mục tiêu\": { \"action\": \"list\", \"object\": \"goal\", \"confidence\": 0.95 }",
    "- \"dời sang ngày mai 8:30\": { \"action\": \"schedule\", \"object\": \"task\", \"confidence\": 0.95, \"scheduledStart\": \"2026-06-09T08:30:00+07:00\" }",
    "- \"thêm 3 project vào goal xây nhà: xây mái, xây tường, xây sân\": { \"action\": \"create\", \"object\": \"project\", \"confidence\": 0.95, \"items\": [\"xây mái\", \"xây tường\", \"xây sân\"], \"parentName\": \"xây nhà\", \"parentType\": \"goal\" }",
    "- \"tạo goals mới tên: thi chứng chỉ SC-03\": { \"action\": \"create\", \"object\": \"goal\", \"confidence\": 0.95, \"title\": \"thi chứng chỉ SC-03\" }",
    "",
    `User command: "${message}"`
  ].join("\n");

  const result = await runOllamaJson({
    prompt,
    schema: intentParserJsonSchema,
    validator: intentParserValidator,
    timeoutMs: 300000
  });

  if (!result.ok) {
    throw new Error(result.error || "Ollama failed to parse intent.");
  }

  return result.value;
}

function extractFieldsFromMessage(parsed, message) {
  const genericTitles = ["mục tiêu mới", "dự án mới", "thói quen mới", "new goal", "new project", "new habit"];
  
  // Patch title if generic or missing
  if (!parsed.title || genericTitles.includes(parsed.title.toLowerCase().trim())) {
    const titleMatch = message.match(/(?:tạo|thêm|create|add)\s+(?:goals?|mục tiêu|projects?|dự án|habits?|thói quen)\s*(?:mới)?\s*(?:tên)?\s*[:\-]\s*(.*)/i)
                    || message.match(/(?:tạo|thêm|create|add)\s+(?:goals?|mục tiêu|projects?|dự án|habits?|thói quen)\s*(?:mới)?\s+(.*)/i);
    if (titleMatch) parsed.title = titleMatch[1].trim();
  }

  // Patch items if missing — detect comma/semicolon-separated list in message
  if (!parsed.items || parsed.items.length === 0) {
    const listMatch = message.match(/[:\-]\s*(.+)/i);
    if (listMatch) {
      const candidates = listMatch[1].split(/[,;]\s*/).map(s => s.trim()).filter(s => s.length > 0);
      if (candidates.length > 1) parsed.items = candidates;
    }
  }

  // Patch parentName if missing — detect "vào/cho goal/project X" pattern
  if (!parsed.parentName) {
    const parentMatch = message.match(/(?:vào|cho|into|for)\s+(?:goal|mục tiêu|project|dự án)\s+([^:\-,;]+)/i);
    if (parentMatch) {
      parsed.parentName = parentMatch[1].trim();
      if (!parsed.parentType) {
        parsed.parentType = parentMatch[0].match(/goal|mục tiêu/i) ? "goal" : "project";
      }
    }
  }

  console.log(`\x1b[36m[DEBUG] extractFieldsFromMessage: title="${parsed.title}", items=${JSON.stringify(parsed.items)}, parentName="${parsed.parentName}", parentType="${parsed.parentType}"\x1b[0m`);
  return parsed;
}

function findParentByName(parentName, parentType) {
  if (!parentName) return null;
  const normalizedName = normalize(parentName);
  
  if (parentType === "goal" || !parentType) {
    const goals = getGoalsOverview();
    const match = goals.find(g => {
      const normalizedTitle = normalize(g.title);
      return normalizedTitle.includes(normalizedName) || normalizedName.includes(normalizedTitle);
    });
    if (match) return { id: match.id, title: match.title, type: "goal" };
  }
  
  if (parentType === "project" || !parentType) {
    const rows = sqlite.prepare("SELECT id, title FROM projects WHERE status != 'archived'").all();
    const match = rows.find(p => {
      const normalizedTitle = normalize(p.title);
      return normalizedTitle.includes(normalizedName) || normalizedName.includes(normalizedTitle);
    });
    if (match) return { id: match.id, title: match.title, type: "project" };
  }
  
  return null;
}

async function executeAiCommand({ message, normalized }) {
  let parsed;
  try {
    parsed = await parseIntentWithLlm(message);
    parsed.intent = mapActionObjectToIntent(parsed.action, parsed.object);
    console.log(`\x1b[35m[DEBUG] AI Parsed Intent: action="${parsed.action}", object="${parsed.object}", confidence=${parsed.confidence}\x1b[0m`);
    console.log(`\x1b[36m[DEBUG] Mapped Intent: "${parsed.intent}"\x1b[0m`);
    parsed = extractFieldsFromMessage(parsed, message);
  } catch (error) {
    console.error(`\x1b[31m[DEBUG] Intent parsing error: ${error.message}\x1b[0m`);
    return readOnlyAnswer(
      "fallback",
      "Hệ thống AI cục bộ đang ngoại tuyến hoặc phản hồi chậm. Bạn có thể sử dụng các màn hình trực tiếp để quản lý công việc.",
      { error: error.message }
    );
  }

  const result = await executeAiCommandInner(parsed, message, normalized);
  if (result && typeof result === "object") {
    result.action = parsed.action;
    result.object = parsed.object;
  }
  return result;
}

async function executeAiCommandInner(parsed, message, normalized) {
  console.log(`\x1b[33m[DEBUG] executeAiCommandInner: Routing to intent handler "${parsed.intent}"\x1b[0m`);

  // Unified bulk creation: if items[] has multiple entries, handle as bulk
  if (parsed.items && parsed.items.length > 1 && parsed.parentName) {
    const parent = findParentByName(parsed.parentName, parsed.parentType);
    if (!parent) {
      return readOnlyAnswer(
        "fallback",
        `Không tìm thấy "${parsed.parentName}" trong hệ thống. Vui lòng tạo trước bằng lệnh "tạo ${parsed.parentType || 'goal'}: ${parsed.parentName}".`,
        {}
      );
    }

    const payload = {
      projects: parsed.items.map(title => ({
        title,
        goal_id: parent.type === "goal" ? parent.id : undefined,
        project_id: parent.type === "project" ? parent.id : undefined,
        status: "active",
        priority: 50
      })),
      tasks: []
    };

    const proposal = createActionProposal({
      intent: "breakdown_goal",
      title: `Thêm ${parsed.items.length} mục con vào ${parent.type === "goal" ? "mục tiêu" : "dự án"}: ${parent.title}`,
      summary: `Tạo hàng loạt: ${parsed.items.join(", ")}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "breakdown_goal",
      answer: `Tôi đã chuẩn bị đề xuất tạo ${parsed.items.length} mục con liên kết với "${parent.title}". Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.confidence < 0.5 || parsed.intent === "fallback") {
    console.log(`[DEBUG] executeAiCommandInner -> fallback (confidence too low or intent fallback)`);
    return readOnlyAnswer(
      "fallback",
      "Tôi không hiểu rõ câu lệnh của bạn. Bạn có thể làm rõ hoặc viết lại câu lệnh được không? (Ví dụ: 'nhắc tôi ngày mai 8:30 học bài')",
      { intent: parsed.intent, confidence: parsed.confidence }
    );
  }

  if (parsed.intent === "create_goal") {
    const title = parsed.title || "Mục tiêu mới";

    const payload = {
      title,
      description: parsed.description || "Tạo qua trợ lý dòng lệnh AI",
      priority: parsed.priority || 50,
      is_north_star: parsed.isNorthStar || parsed.is_north_star || false
    };

    const proposal = createActionProposal({
      intent: "create_goal",
      title: `Tạo mục tiêu mới: ${title}`,
      summary: `Thiết lập mục tiêu chiến lược với mức ưu tiên ${payload.priority}.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_goal",
      answer: `Tôi đã chuẩn bị đề xuất tạo mục tiêu mới "${title}". Hãy xác nhận bên dưới để hoàn tất lưu vào SQLite.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "create_project") {
    const title = parsed.title || "Dự án mới";

    let goalId = parsed.goalId || parsed.goal_id;
    if (!goalId && parsed.parentName) {
      const parent = findParentByName(parsed.parentName, "goal");
      if (parent) goalId = parent.id;
    }
    if (!goalId) {
      const goals = getGoalsOverview();
      const firstGoal = goals.find((g) => g.is_north_star === 1) || goals[0];
      if (firstGoal) goalId = firstGoal.id;
    }

    if (!goalId) {
      return readOnlyAnswer(
        "fallback",
        "Tôi không thể tạo dự án vì hệ thống chưa có mục tiêu chiến lược nào. Vui lòng tạo mục tiêu trước.",
        {}
      );
    }

    const payload = {
      title,
      goal_id: goalId,
      description: parsed.description || "Tạo qua trợ lý dòng lệnh AI",
      priority: parsed.priority || 50
    };

    const proposal = createActionProposal({
      intent: "create_project",
      title: `Tạo dự án mới: ${title}`,
      summary: `Tạo dự án liên kết với mục tiêu chiến lược.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_project",
      answer: `Tôi đã chuẩn bị đề xuất tạo dự án mới "${title}". Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "create_habit") {
    const title = parsed.title || "Thói quen mới";

    const payload = {
      title,
      frequency: "daily",
      target_count: 5,
      status: "active"
    };

    const proposal = createActionProposal({
      intent: "create_habit",
      title: `Tạo thói quen mới: ${title}`,
      summary: `Thiết lập thói quen rèn luyện hàng ngày.`,
      payload
    });

    return {
      mode: "proposal",
      intent: "create_habit",
      answer: `Tôi đã chuẩn bị đề xuất tạo thói quen rèn luyện "${title}". Hãy xác nhận bên dưới.`,
      proposal,
      related_context: payload
    };
  }

  if (parsed.intent === "list_goals") {
    console.log(`[DEBUG] executeAiCommandInner -> list_goals: Calling getGoalsOverview()`);
    const goals = getGoalsOverview();
    return readOnlyAnswer("list_goals", "Đang chuyển hướng sang màn hình Mục tiêu.", goals);
  }

  if (parsed.intent === "list_projects") {
    console.log(`[DEBUG] executeAiCommandInner -> list_projects: Calling getGoalsOverview()`);
    const goals = getGoalsOverview();
    return readOnlyAnswer("list_projects", "Đang chuyển hướng sang màn hình Dự án.", goals);
  }

  if (parsed.intent === "list_tasks") {
    console.log(`[DEBUG] executeAiCommandInner -> list_tasks: Calling selectTasks()`);
    const allTasks = selectTasks();
    return readOnlyAnswer("list_tasks", "Đang chuyển hướng sang màn hình Công việc.", allTasks);
  }

  if (parsed.intent === "list_habits") {
    console.log(`[DEBUG] executeAiCommandInner -> list_habits: Calling getHabitDashboard()`);
    const habits = getHabitDashboard();
    return readOnlyAnswer("list_habits", "Đang chuyển hướng sang màn hình Thói quen.", habits);
  }

  if (parsed.intent === "organize_inbox") {
    console.log(`[DEBUG] executeAiCommandInner -> organize_inbox: Calling organizeInboxIntoProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> plan_day: Calling createPlanDayProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> create_task: Calling createTaskProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> create_reminder: Calling createActionProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> create_event: Calling buildCalendarConflictValidation() and createActionProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> create_time_block: Calling buildCalendarConflictValidation() and createActionProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> bulk_reschedule: Calling selectTasks() and createActionProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> reschedule_task: Calling getTodayView() and createRescheduleProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> create_deadline: Calling selectTasks(), getGoalsOverview(), and createActionProposal()`);
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

  if (parsed.intent === "deadline_radar") {
    console.log(`[DEBUG] executeAiCommandInner -> deadline_radar: Calling getDeadlineRadar()`);
    const radar = getDeadlineRadar();
    return readOnlyAnswer("deadline_radar", "Đang chuyển hướng sang màn hình Hạn chót.", radar);
  }

  if (parsed.intent === "explain_deadline") {
    console.log(`[DEBUG] executeAiCommandInner -> explain_deadline: Calling getDeadlineRadar() and runOllamaJson()`);
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
        timeoutMs: 300000
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
        explanation = "Hạn chót của bạn hiện tại đang ở trạng thái an toàn. Không có mục nào quá hạn hoặc khân cấp trong ngày hôm nay.";
      }
    }

    return readOnlyAnswer(
      "explain_deadline",
      explanation,
      radar
    );
  }

  if (parsed.intent === "daily_review") {
    console.log(`[DEBUG] executeAiCommandInner -> daily_review: Calling getReviewSummary() and createDailyReviewProposal()`);
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
    console.log(`[DEBUG] executeAiCommandInner -> explain_priority: Calling rankOpenTasks()`);
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

  return readOnlyAnswer("fallback", `System Error: Chưa có function xử lý hoặc cấu hình sai logic cho intent [${parsed.intent}].`, {});
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


