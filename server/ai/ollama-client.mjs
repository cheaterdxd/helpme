import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sqlite } from "../db/client.mjs";

const defaultBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const defaultModel = process.env.OLLAMA_MODEL || "qwen3:1.7b";

export async function getOllamaStatus() {
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(`${defaultBaseUrl}/api/tags`, {
      timeoutMs: 1200
    });

    if (!response.ok) {
      return {
        ok: false,
        model: defaultModel,
        base_url: defaultBaseUrl,
        latency_ms: Date.now() - startedAt,
        error: `Ollama returned ${response.status}.`
      };
    }

    const body = await response.json();
    const models = Array.isArray(body.models) ? body.models.map((model) => model.name) : [];

    return {
      ok: true,
      model: defaultModel,
      base_url: defaultBaseUrl,
      latency_ms: Date.now() - startedAt,
      models,
      model_available: models.includes(defaultModel)
    };
  } catch (error) {
    return {
      ok: false,
      model: defaultModel,
      base_url: defaultBaseUrl,
      latency_ms: Date.now() - startedAt,
      error: error.message
    };
  }
}

export async function runOllamaJson({ prompt, schema, model = defaultModel, timeoutMs = 3000 }) {
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
    const parsed = JSON.parse(body.response || "{}");
    const checked = z.object({}).passthrough().safeParse(parsed);
    if (!checked.success) {
      throw new Error("Ollama JSON response failed validation.");
    }

    recordAiRun({
      id: runId,
      model,
      input: { prompt, schema },
      output: parsed,
      status: "ok",
      latencyMs: Date.now() - startedAt,
      error: null,
      createdAt
    });

    return {
      ok: true,
      value: parsed,
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
      error: error.message,
      createdAt
    });

    return {
      ok: false,
      error: error.message,
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
