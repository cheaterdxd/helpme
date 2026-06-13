import { randomUUID } from "node:crypto";
import { sqlite } from "../db/client.mjs";

const DEFAULT_QUICK_TIMEOUT_MS = 5000;
const DEFAULT_DEEP_TIMEOUT_MS = 15000;
const DEFAULT_MAX_STEPS = 6;
const DEFAULT_MAX_CONTEXT_ITEMS = 24;

function getSetting(key, defaultValue) {
  try {
    const row = sqlite.prepare("SELECT value_json FROM settings WHERE key = ?").get(key);
    if (row) return JSON.parse(row.value_json);
  } catch (error) {
    // Ignore error
  }
  return defaultValue;
}

const allowedIntents = [
  "organize_inbox",
  "plan_day",
  "create_task",
  "reschedule_task",
  "deadline_radar",
  "daily_review",
  "explain_priority",
  "breakdown_task",
  "create_reminder",
  "fallback"
];

export async function orchestrateAiCommand({ rawMessage, execute, requestedMode = "quick" }) {
  const startedAt = Date.now();
  const runId = `orchestrator_${randomUUID()}`;
  const mode = requestedMode === "deep" ? "deep" : "quick";
  const budget = buildBudget(mode);
  const lifecycle = [];
  let normalized = "";
  let intentHint = "unknown";

  try {
    const message = await runStep(lifecycle, "understand", () => {
      const trimmed = String(rawMessage ?? "").trim();
      normalized = normalize(trimmed);
      intentHint = inferIntentHint(normalized);

      if (!trimmed) {
        throw new OrchestratorError("empty_message", "Message is required.");
      }

      return trimmed;
    });

    const context = await runStep(lifecycle, "gather_context", () => ({
      locale: "vi-VN",
      max_context_items: budget.max_context_items,
      allowed_intents: allowedIntents,
      input_length: message.length
    }));

    const plan = await runStep(lifecycle, "plan", () => ({
      mode,
      intent_hint: intentHint,
      steps: ["domain_execute", "validate_response", "attach_orchestration"],
      requires_confirmation_for_mutation: true
    }));

    await runStep(lifecycle, "validate", () => validatePlan({ plan, context, budget }));

    const response = await runStep(
      lifecycle,
      "propose",
      () =>
        withTimeout(
          execute({
            message,
            normalized,
            orchestration: {
              run_id: runId,
              mode,
              budget,
              intent_hint: intentHint,
              context
            }
          }),
          budget.timeout_ms
        ),
      { timeout_ms: budget.timeout_ms }
    );

    const checkedResponse = await runStep(lifecycle, "log", () => validateCommandResponse(response));

    return {
      ...checkedResponse,
      orchestration: buildOrchestrationMeta({
        runId,
        mode,
        status: "ok",
        startedAt,
        lifecycle,
        budget,
        intentHint,
        error: null
      })
    };
  } catch (error) {
    return buildSafeErrorResponse({
      error,
      runId,
      mode,
      startedAt,
      lifecycle,
      budget,
      intentHint
    });
  }
}

function buildBudget(mode) {
  const timeoutMs =
    mode === "deep"
      ? Number(getSetting("deep_timeout_ms", process.env.HELPME_AI_DEEP_TIMEOUT_MS || DEFAULT_DEEP_TIMEOUT_MS))
      : Number(getSetting("model_timeout_ms", process.env.HELPME_AI_QUICK_TIMEOUT_MS || DEFAULT_QUICK_TIMEOUT_MS));

  return {
    timeout_ms: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_QUICK_TIMEOUT_MS,
    max_steps: Number(getSetting("max_steps", process.env.HELPME_AI_MAX_STEPS || DEFAULT_MAX_STEPS)),
    max_context_items: Number(getSetting("max_context_items", process.env.HELPME_AI_MAX_CONTEXT_ITEMS || DEFAULT_MAX_CONTEXT_ITEMS))
  };
}

async function runStep(lifecycle, step, fn, extra = {}) {
  const startedAt = Date.now();

  try {
    const value = await fn();
    lifecycle.push({
      step,
      status: "ok",
      latency_ms: Date.now() - startedAt,
      ...extra
    });
    return value;
  } catch (error) {
    lifecycle.push({
      step,
      status: "error",
      latency_ms: Date.now() - startedAt,
      error_code: error instanceof OrchestratorError ? error.code : "step_failed",
      ...extra
    });
    throw error;
  }
}

function validatePlan({ plan, context, budget }) {
  if (!allowedIntents.includes(plan.intent_hint) && plan.intent_hint !== "unknown") {
    throw new OrchestratorError("unsupported_intent", "This command intent is not supported yet.");
  }

  if (plan.steps.length > budget.max_steps) {
    throw new OrchestratorError("step_budget_exceeded", "This command needs too many orchestration steps.");
  }

  if (context.allowed_intents.length > budget.max_context_items) {
    throw new OrchestratorError("context_budget_exceeded", "This command needs too much context.");
  }

  return { ok: true };
}

function validateCommandResponse(response) {
  if (!response || typeof response !== "object") {
    throw new OrchestratorError("invalid_response", "Command handler returned an invalid response.");
  }

  if (response.mode !== "answer" && response.mode !== "proposal") {
    throw new OrchestratorError("invalid_response_mode", "Command handler returned an invalid response mode.");
  }

  if (typeof response.intent !== "string" || !response.intent.trim()) {
    throw new OrchestratorError("invalid_response_intent", "Command handler returned an invalid intent.");
  }

  if (typeof response.answer !== "string" || !response.answer.trim()) {
    throw new OrchestratorError("invalid_response_answer", "Command handler returned an invalid answer.");
  }

  if (response.mode === "proposal" && !response.proposal?.id) {
    throw new OrchestratorError("invalid_proposal", "Command handler returned a proposal response without a proposal id.");
  }

  return response;
}

function buildSafeErrorResponse({ error, runId, mode, startedAt, lifecycle, budget, intentHint }) {
  const code = error instanceof OrchestratorError ? error.code : "orchestrator_error";
  const message = error instanceof OrchestratorError ? error.message : formatError(error);

  return {
    mode: "answer",
    intent: "orchestrator_error",
    answer: message,
    related_context: {
      error_code: code
    },
    suggested_actions: [],
    orchestration: buildOrchestrationMeta({
      runId,
      mode,
      status: "error",
      startedAt,
      lifecycle,
      budget,
      intentHint,
      error: {
        code,
        message
      }
    })
  };
}

function buildOrchestrationMeta({ runId, mode, status, startedAt, lifecycle, budget, intentHint, error }) {
  return {
    run_id: runId,
    mode,
    status,
    intent_hint: intentHint,
    lifecycle,
    budget,
    latency_ms: Date.now() - startedAt,
    error
  };
}

function inferIntentHint(normalized) {
  if (normalized.includes("inbox") || normalized.includes("organize") || normalized.includes("sap xep viec roi rac")) return "organize_inbox";
  if (normalized.includes("plan") || normalized.includes("ke hoach") || normalized.includes("sap lich") || normalized.includes("xep lich")) return "plan_day";
  if (normalized.includes("nhac nho") || normalized.includes("reminder") || (normalized.includes("nhac") && !normalized.includes("hoc") && !normalized.includes("task"))) return "create_reminder";
  if (normalized.includes("nhac toi") || normalized.includes("them task") || normalized.includes("tao task") || normalized.includes("add task")) return "create_task";
  if (normalized.includes("doi") || normalized.includes("reschedule") || normalized.includes("move") || normalized.includes("sang ngay mai")) return "reschedule_task";
  if (normalized.includes("deadline") || normalized.includes("han") || normalized.includes("qua han")) return "deadline_radar";
  if (normalized.includes("review") || normalized.includes("cuoi ngay") || normalized.includes("tong ket")) return "daily_review";
  if (normalized.includes("chia nho") || normalized.includes("breakdown") || normalized.includes("chia nho task")) return "breakdown_task";
  return "unknown";
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new OrchestratorError("timeout", "HelpMe took too long to process this command.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

class OrchestratorError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
  }
}
