import { randomUUID } from "node:crypto";
import { sqlite } from "../db/client.mjs";

const defaultBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const defaultModel = process.env.OLLAMA_MODEL || "qwen3:1.7b";

export async function getOllamaStatus() {
  const startedAt = Date.now();
  const base = {
    provider: "ollama",
    ok: false,
    online: false,
    model: defaultModel,
    configured_model: defaultModel,
    base_url: defaultBaseUrl,
    fallback_mode: "rule-based",
    setup_hint: `Run \`ollama serve\` and \`ollama pull ${defaultModel}\` to enable local AI summaries.`
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
    const models = Array.isArray(body.models) ? body.models.map((model) => model.name) : [];
    const modelAvailable = models.includes(defaultModel);

    return {
      ...base,
      ok: modelAvailable,
      online: true,
      latency_ms: Date.now() - startedAt,
      models,
      model_available: modelAvailable,
      error: modelAvailable ? null : `Configured model "${defaultModel}" is not installed.`
    };
  } catch (error) {
    return {
      ...base,
      latency_ms: Date.now() - startedAt,
      error: formatError(error)
    };
  }
}

export async function runOllamaJson({ prompt, schema, validator, model = defaultModel, timeoutMs = 3000 }) {
  const runId = `ai_run_${randomUUID()}`;
  const startedAt = Date.now();
  const createdAt = new Date().toISOString();

  try {
    const response = await fetchWithTimeout(`${defaultBaseUrl}/api/generate`, {
      timeoutMs,
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
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
      model,
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
      model,
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
