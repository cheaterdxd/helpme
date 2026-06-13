import { randomUUID } from "node:crypto";
import { sqlite } from "../db/client.mjs";

const defaultBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const defaultModel = process.env.OLLAMA_MODEL || "qwen3:1.7b";

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
  const resolvedTimeout = timeoutMs ?? getSetting("model_timeout_ms", 3000);
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
        format: schema
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
  const norm = prompt.toLowerCase();

  // 1. Plan summary mock
  if (norm.includes("summarize this daily plan")) {
    return {
      summary: "Tôi đã lập kế hoạch cho buổi tối hôm nay.",
      reason: "Dành thời gian tập trung giải quyết các tác vụ có mức độ ưu tiên cao."
    };
  }

  // 2. Intent parsing mock
  if (norm.includes('user command: "organize inbox"')) {
    return { intent: "organize_inbox", confidence: 0.95 };
  }
  if (norm.includes('user command: "hom nay toi ranh tu 20h den 23h, sap lich giup toi"')) {
    return {
      intent: "plan_day",
      confidence: 0.98,
      availableStart: "20:00",
      availableEnd: "23:00"
    };
  }
  if (norm.includes('user command: "nhac toi 20h hoc aws 1h"')) {
    return {
      intent: "create_task",
      confidence: 0.95,
      title: "hoc AWS",
      scheduledStart: "2026-06-08T20:00:00+07:00",
      estimatedMinutes: 60,
      priority: 55
    };
  }
  if (norm.includes('user command: "nhac toi ngay mai 8:30 hoc aws 60 phut"')) {
    return {
      intent: "create_task",
      confidence: 0.97,
      title: "hoc AWS",
      scheduledStart: "2026-06-09T08:30:00+07:00",
      estimatedMinutes: 60,
      priority: 55
    };
  }
  if (norm.includes('user command: "move sang ngay mai 8:30h"')) {
    return {
      intent: "reschedule_task",
      confidence: 0.96,
      scheduledStart: "2026-06-09T08:30:00+07:00"
    };
  }
  if (norm.includes('user command: "move sang ngay mai 10h"')) {
    return {
      intent: "reschedule_task",
      confidence: 0.96,
      scheduledStart: "2026-06-09T10:00:00+07:00"
    };
  }
  if (norm.includes('user command: "evening review"')) {
    return { intent: "daily_review", confidence: 0.95 };
  }
  if (norm.includes('user command: "deadline"') || norm.includes('user command: "han chot"')) {
    return { intent: "deadline_radar", confidence: 0.95 };
  }
  if (norm.includes('user command: "abcxyz"')) {
    return { intent: "fallback", confidence: 0.2 };
  }

  // Generic fallback if not matched
  return {
    intent: "fallback",
    confidence: 0.1
  };
}
