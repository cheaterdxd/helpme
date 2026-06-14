import { randomUUID } from "node:crypto";
import { sqlite } from "../db/client.mjs";

const defaultBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const defaultModel = process.env.OLLAMA_MODEL || "qwen3:1.7b";
// const intentParser = "qwen3:1.7b";

function getSetting(key, defaultValue) {
  try {
    const row = sqlite.prepare("SELECT value_json FROM settings WHERE key = ?").get(key);
    if (row) return JSON.parse(row.value_json);
  } catch (error) {
    // Ignore error
  }
  return defaultValue;
}

export async function getOllamaStatus() {
  const model = getSetting("preferred_model", defaultModel);
  if (process.env.HELPME_MOCK_AI === "true") {
    return {
      provider: "ollama",
      ok: true,
      online: true,
      model: model,
      configured_model: model,
      base_url: defaultBaseUrl,
      fallback_mode: "rule-based",
      setup_hint: `Run \`ollama serve\` and \`ollama pull ${model}\` to enable local AI summaries.`,
      latency_ms: 1,
      models: [model],
      model_available: true,
      error: null
    };
  }
  const startedAt = Date.now();
  const base = {
    provider: "ollama",
    ok: false,
    online: false,
    model: model,
    configured_model: model,
    base_url: defaultBaseUrl,
    fallback_mode: "rule-based",
    setup_hint: `Run \`ollama serve\` and \`ollama pull ${model}\` to enable local AI summaries.`
  };

  try {
    const response = await fetchWithTimeout(`${defaultBaseUrl}/api/tags`, {
      timeoutMs: 1200
    });

    if (!response.ok) {
      return {
        ...base,
        latency_ms: Date.now() - startedAt,
        error: `Ollama returned ${response.status}.`
      };
    }

    const body = await response.json();
    const models = Array.isArray(body.models) ? body.models.map((m) => m.name) : [];
    const modelAvailable = models.includes(model);

    return {
      ...base,
      ok: modelAvailable,
      online: true,
      latency_ms: Date.now() - startedAt,
      models,
      model_available: modelAvailable,
      error: modelAvailable ? null : `Configured model "${model}" is not installed.`
    };
  } catch (error) {
    return {
      ...base,
      latency_ms: Date.now() - startedAt,
      error: formatError(error)
    };
  }
}

export async function runOllamaJson({ prompt, schema, validator, model, timeoutMs }) {
  const resolvedModel = model ?? getSetting("preferred_model", defaultModel);
  const resolvedTimeout = timeoutMs ?? getSetting("model_timeout_ms", 300000);
  const maxContextChars = Number(getSetting("max_context_chars", process.env.HELPME_AI_MAX_CONTEXT_CHARS || 32000));
  if (prompt && prompt.length > maxContextChars) {
    throw new Error(`Prompt length (${prompt.length}) exceeds context limit of ${maxContextChars} characters.`);
  }

  const runId = `ai_run_${randomUUID()}`;
  const startedAt = Date.now();
  const createdAt = new Date().toISOString();

  if (process.env.HELPME_MOCK_AI === "true") {
    try {
      const mockVal = mockOllamaResponse(prompt);
      const checked = validator ? validator.safeParse(mockVal) : { success: true, data: mockVal };
      if (!checked.success) {
        throw new Error(`Mock Ollama JSON response failed validation: ${checked.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
      }

      recordAiRun({
        id: runId,
        model: resolvedModel,
        input: { prompt, schema },
        output: checked.data,
        status: "ok",
        latencyMs: Date.now() - startedAt,
        error: null,
        createdAt
      });

      return {
        ok: true,
        value: checked.data,
        run_id: runId
      };
    } catch (error) {
      recordAiRun({
        id: runId,
        model: resolvedModel,
        input: { prompt, schema },
        output: null,
        status: "error",
        latencyMs: Date.now() - startedAt,
        error: formatError(error),
        createdAt
      });

      return {
        ok: false,
        error: formatError(error),
        run_id: runId
      };
    }
  }

  try {
    const response = await fetchWithTimeout(`${defaultBaseUrl}/api/generate`, {
      timeoutMs: resolvedTimeout,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: resolvedModel,
        prompt,
        stream: false,
        format: schema,
        options: {
          num_ctx: Math.max(8192, Math.ceil(maxContextChars / 2))
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}.`);
    }

    const body = await response.json();
    const rawText = body.response || "{}";
    const parsed = JSON.parse(rawText);
    const checked = validator ? validator.safeParse(parsed) : { success: true, data: parsed };
    if (!checked.success) {
      throw new Error(`Ollama JSON response failed validation: ${checked.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
    }

    recordAiRun({
      id: runId,
      model: resolvedModel,
      input: { prompt, schema },
      output: checked.data,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      error: null,
      createdAt
    });

    return {
      ok: true,
      value: checked.data,
      run_id: runId
    };
  } catch (error) {
    recordAiRun({
      id: runId,
      model: resolvedModel,
      input: { prompt, schema },
      output: null,
      status: "error",
      latencyMs: Date.now() - startedAt,
      error: formatError(error),
      createdAt
    });

    return {
      ok: false,
      error: formatError(error),
      run_id: runId
    };
  }
}

async function fetchWithTimeout(url, { timeoutMs, ...options }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function recordAiRun({ id, model, input, output, status, latencyMs, error, createdAt }) {
  sqlite
    .prepare(
      `INSERT INTO ai_runs (id, model, input_json, output_json, status, latency_ms, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, model, JSON.stringify(input), output ? JSON.stringify(output) : null, status, latencyMs, error, createdAt);
}

function formatError(error) {
  if (error?.name === "AbortError") {
    return "Ollama request timed out.";
  }

  return error instanceof Error ? error.message : String(error);
}

function mockOllamaResponse(prompt) {
  const norm = prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Extract user command to avoid matching examples in instructions
  const matchUserCmd = prompt.match(/User command:\s*"(.*)"/s);
  const userCmd = matchUserCmd ? matchUserCmd[1] : prompt;
  const normCmd = userCmd.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Daily planner candidates mock
  if (norm.includes("select the best tasks to schedule for today")) {
    return {
      selected_task_ids: ["task_practice_questions", "task_read_notes"],
      overload_resolved: false,
      overload_resolution_summary: "Không có quá tải.",
      plan_explanation: "Tôi đã sắp xếp thời gian để bạn tập trung học AWS."
    };
  }

  // Task breakdown mock
  if (norm.includes("task breakdown specialist")) {
    return {
      explanation: "Tôi đề xuất chia nhỏ công việc của bạn.",
      subtasks: [
        { title: "Review AWS study guide", estimated_minutes: 30, priority: 70 },
        { title: "Read UC-45 revision notes", estimated_minutes: 45, priority: 80 },
        { title: "Complete AWS security lab practice", estimated_minutes: 60, priority: 90 }
      ]
    };
  }

  // 1.5. Plan summary mock
  if (norm.includes("summarize this daily plan")) {
    return {
      summary: "Tôi đã lập kế hoạch cho buổi tối hôm nay.",
      reason: "Dành thời gian tập trung giải quyết các tác vụ có mức độ ưu tiên cao."
    };
  }

  // 2. Intent parsing mock
  if (normCmd.includes('list goals') || normCmd.includes('liet ke muc tieu')) {
    return { action: "list", object: "goal", confidence: 0.95 };
  }
  if (normCmd.includes('list projects') || normCmd.includes('liet ke du an')) {
    const match = normCmd.match(/(?:trong|of|for|in) goal (.*)$/) || normCmd.match(/(?:trong|of|for|in) muc tieu (.*)$/);
    return {
      action: "list",
      object: "project",
      confidence: 0.95,
      title: match ? match[1].trim() : undefined
    };
  }
  if (normCmd.includes('list tasks') || normCmd.includes('liet ke cong viec')) {
    return { action: "list", object: "tasks", confidence: 0.95 };
  }
  if (normCmd.includes('list habits') || normCmd.includes('liet ke thoi quen')) {
    return { action: "list", object: "habits", confidence: 0.95 };
  }
  if (normCmd.includes("organize inbox")) {
    return { action: "organize", object: "inbox", confidence: 0.95 };
  }
  if (normCmd.includes("tao muc tieu hoc aws")) {
    return {
      action: "create",
      object: "goal",
      confidence: 0.97,
      title: "học AWS"
    };
  }
  if (normCmd.includes("tao project thiet lap lab aws")) {
    return {
      action: "create",
      object: "project",
      confidence: 0.96,
      title: "thiết lập lab AWS"
    };
  }
  if (normCmd.includes("chia nho task hoc aws")) {
    return {
      action: "breakdown",
      object: "task",
      confidence: 0.96,
      title: "học AWS"
    };
  }
  if (normCmd.includes("hom nay toi ranh tu 20h den 23h, sap lich giup toi")) {
    return {
      action: "schedule",
      object: "day_plan",
      confidence: 0.98,
      availableStart: "20:00",
      availableEnd: "23:00"
    };
  }
  if (normCmd.includes("nhac toi 20h hoc aws 1h")) {
    return {
      action: "create",
      object: "task",
      confidence: 0.95,
      title: "hoc AWS",
      scheduledStart: "2026-06-08T20:00:00+07:00",
      estimatedMinutes: 60,
      priority: 55
    };
  }
  if (normCmd.includes("nhac toi ngay mai 8:30 hoc aws 60 phut")) {
    return {
      action: "create",
      object: "task",
      confidence: 0.97,
      title: "hoc AWS",
      scheduledStart: "2026-06-09T08:30:00+07:00",
      estimatedMinutes: 60,
      priority: 55
    };
  }
  if (normCmd.includes("move sang ngay mai 8:30h")) {
    return {
      action: "schedule",
      object: "task",
      confidence: 0.96,
      scheduledStart: "2026-06-09T08:30:00+07:00"
    };
  }
  if (normCmd.includes("move sang ngay mai 10h")) {
    return {
      action: "schedule",
      object: "task",
      confidence: 0.96,
      scheduledStart: "2026-06-09T10:00:00+07:00"
    };
  }
  if (normCmd.includes("evening review")) {
    return { action: "statistics", object: "daily_review", confidence: 0.95 };
  }
  if (normCmd.includes("deadline") || normCmd.includes("han chot")) {
    return { action: "list", object: "deadline", confidence: 0.95 };
  }
  if (normCmd.includes("nhac toi uong nuoc sau 15 phut")) {
    return {
      action: "create",
      object: "reminder",
      confidence: 0.95,
      title: "uống nước",
      scheduledStart: "2026-06-08T20:15:00+07:00"
    };
  }
  if (normCmd.includes("abcxyz")) {
    return { action: "fallback", object: "fallback", confidence: 0.2 };
  }

  // Generic fallback if not matched
  return {
    action: "fallback",
    object: "fallback",
    confidence: 0.1
  };
}
