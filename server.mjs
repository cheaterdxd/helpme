import fastifyStatic from "@fastify/static";
import middie from "@fastify/middie";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { aiCommandRequestSchema, handleAiCommand } from "./server/ai/command.mjs";
import { getOllamaStatus } from "./server/ai/ollama-client.mjs";
import {
  completeFocusSession,
  completeTask,
  confirmActionProposal,
  rejectActionProposal,
  getCalendarView,
  getDeadlineRadar,
  getGoalsOverview,
  getHabitDashboard,
  getReviewSummary,
  getTaskCollections,
  getTodayView,
  logHabitToday,
  organizeInboxIntoProposal,
  reopenTask,
  startFocusSession,
  getSettings,
  updateSettings,
  createTask,
  updateTask,
  deleteTask,
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
  snoozeReminder,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  createDeadline,
  updateDeadline,
  deleteDeadline
} from "./server/db/app-queries.mjs";
import { buildNowBriefing } from "./server/db/now-query.mjs";
import { seedDatabase } from "./server/db/seed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname);
const distDir = join(rootDir, "dist");
const publicDir = join(rootDir, "public");
const mockDataDir = join(rootDir, "server", "mock-data");
const port = Number.parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";
const askResponses = await loadMockJson("ask-responses.json");

await seedDatabase();

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});

app.get("/healthz", async () => ({
  ok: true,
  app: "helpme",
  mode: isProduction ? "production" : "development"
}));

app.get("/api/now", async () => buildNowBriefing());

app.get("/api/today", async () => getTodayView());

app.get("/api/tasks", async () => getTaskCollections());

app.post("/api/tasks", async (request, reply) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = createTask(body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.patch("/api/tasks/:id", async (request, reply) => {
  const taskId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = updateTask(taskId, body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.delete("/api/tasks/:id", async (request, reply) => {
  const taskId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = deleteTask(taskId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.post("/api/tasks/:id/complete", async (request, reply) => {
  const taskId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = completeTask(taskId);

  if (!result.ok) {
    return reply.code(404).send(result);
  }

  return result;
});

app.post("/api/tasks/:id/reopen", async (request, reply) => {
  const taskId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = reopenTask(taskId);

  if (!result.ok) {
    return reply.code(404).send(result);
  }

  return result;
});

app.post("/api/tasks/:id/focus/start", async (request, reply) => {
  const taskId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = startFocusSession(taskId);

  if (!result.ok) {
    return reply.code(result.status_code ?? 400).send(result);
  }

  return result;
});

app.post("/api/focus-sessions/:id/complete", async (request, reply) => {
  const sessionId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = completeFocusSession(sessionId, { completeTask: body.complete_task === true });

  if (!result.ok) {
    return reply.code(result.status_code ?? 400).send(result);
  }

  return result;
});

app.post("/api/inbox/organize", async () => organizeInboxIntoProposal());

app.get("/api/reminders", async () => getReminders());

app.post("/api/reminders", async (request, reply) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = createReminder(body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.patch("/api/reminders/:id", async (request, reply) => {
  const reminderId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = updateReminder(reminderId, body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.delete("/api/reminders/:id", async (request, reply) => {
  const reminderId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = deleteReminder(reminderId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.post("/api/reminders/:id/complete", async (request, reply) => {
  const reminderId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = completeReminder(reminderId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.post("/api/reminders/:id/snooze", async (request, reply) => {
  const reminderId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = snoozeReminder(reminderId, body.minutes ?? 15);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.get("/api/calendar", async (request) => {
  const mode = typeof request.query?.mode === "string" ? request.query.mode : "day";
  const startDate = typeof request.query?.start_date === "string" ? request.query.start_date : undefined;
  return getCalendarView(mode, startDate);
});

app.post("/api/calendar/events", async (request, reply) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = createCalendarEvent(body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.patch("/api/calendar/events/:id", async (request, reply) => {
  const eventId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = updateCalendarEvent(eventId, body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.delete("/api/calendar/events/:id", async (request, reply) => {
  const eventId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = deleteCalendarEvent(eventId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.post("/api/calendar/time-blocks", async (request, reply) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = createTimeBlock(body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.patch("/api/calendar/time-blocks/:id", async (request, reply) => {
  const timeBlockId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = updateTimeBlock(timeBlockId, body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.delete("/api/calendar/time-blocks/:id", async (request, reply) => {
  const timeBlockId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = deleteTimeBlock(timeBlockId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.get("/api/deadlines", async () => getDeadlineRadar());

app.post("/api/deadlines", async (request, reply) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = createDeadline(body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.patch("/api/deadlines/:id", async (request, reply) => {
  const deadlineId = typeof request.params?.id === "string" ? request.params.id : "";
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const result = updateDeadline(deadlineId, body);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.delete("/api/deadlines/:id", async (request, reply) => {
  const deadlineId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = deleteDeadline(deadlineId);
  if (!result.ok) {
    return reply.code(400).send(result);
  }
  return result;
});

app.get("/api/habits", async () => getHabitDashboard());

app.post("/api/habits/:id/log", async (request, reply) => {
  const habitId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = logHabitToday(habitId);

  if (!result.ok) {
    return reply.code(404).send(result);
  }

  return result;
});

app.get("/api/goals", async () => getGoalsOverview());

app.get("/api/review", async () => getReviewSummary());

app.get("/api/ai/status", async () => getOllamaStatus());

app.get("/api/settings", async () => getSettings());

app.post("/api/settings", async (request) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  return updateSettings(body);
});

app.post("/api/ai/command", async (request, reply) => {
  const parsed = aiCommandRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: "Message is required." });
  }

  return handleAiCommand(parsed.data.message);
});

app.post("/api/ai/proposals/:id/confirm", async (request, reply) => {
  const proposalId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = confirmActionProposal(proposalId);

  if (!result.ok) {
    return reply.code(400).send(result);
  }

  return result;
});

app.post("/api/ai/proposals/:id/reject", async (request, reply) => {
  const proposalId = typeof request.params?.id === "string" ? request.params.id : "";
  const result = rejectActionProposal(proposalId);

  if (!result.ok) {
    return reply.code(400).send(result);
  }

  return result;
});

app.post("/api/ask", async (request) => {
  const body = typeof request.body === "object" && request.body !== null ? request.body : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  return handleAiCommand(message || "Vì sao chọn việc này?");
});

if (isProduction) {
  if (!existsSync(distDir)) {
    app.log.warn("dist directory is missing. Run `npm run build` before `npm start`.");
  }

  await app.register(fastifyStatic, {
    root: distDir,
    prefix: "/",
    decorateReply: true
  });

  app.setNotFoundHandler(async (request, reply) => {
    if (request.raw.url?.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }

    return reply.type("text/html").send(await readFile(join(distDir, "index.html"), "utf8"));
  });
} else {
  await app.register(middie);

  const vite = await createViteServer({
    root: rootDir,
    appType: "spa",
    server: {
      middlewareMode: true,
      watch: {
        ignored: ["**/node_modules/**", "**/dist/**"]
      }
    },
    publicDir
  });

  app.use((request, response, next) => {
    if (request.url?.startsWith("/api/") || request.url === "/healthz") {
      next();
      return;
    }

    vite.middlewares(request, response, next);
  });
}

await app.listen({ port, host });

function buildMockAnswer(message) {
  if (!message) {
    return askResponses.empty;
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("30")) {
    return askResponses.short_time;
  }

  if (normalized.includes("hidden") || normalized.includes("task")) {
    return askResponses.hidden_tasks;
  }

  if (normalized.includes("drift") || normalized.includes("goal")) {
    return askResponses.goal_drift;
  }

  return askResponses.default;
}

async function loadMockJson(fileName) {
  const fileContent = await readFile(join(mockDataDir, fileName), "utf8");
  return JSON.parse(fileContent);
}
