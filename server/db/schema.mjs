import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  priority: integer("priority").notNull().default(0),
  isNorthStar: integer("is_north_star", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  priority: integer("priority").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  parentTaskId: text("parent_task_id"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: integer("priority").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes"),
  dueAt: text("due_at"),
  scheduledStart: text("scheduled_start"),
  scheduledEnd: text("scheduled_end"),
  fitsAvailableTime: integer("fits_available_time", { mode: "boolean" }).notNull().default(false),
  visibleInNow: integer("visible_in_now", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const deadlines = sqliteTable("deadlines", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  dueAt: text("due_at").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("active"),
  goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const calendarBlocks = sqliteTable("calendar_blocks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const calendarEvents = sqliteTable("calendar_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  location: text("location"),
  source: text("source").notNull().default("manual"),
  linkedTaskId: text("linked_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  targetCount: integer("target_count").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const habitLogs = sqliteTable("habit_logs", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
  logDate: text("log_date").notNull(),
  value: integer("value").notNull().default(1),
  note: text("note"),
  createdAt: text("created_at").notNull()
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  remindAt: text("remind_at").notNull(),
  status: text("status").notNull().default("scheduled"),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  deadlineId: text("deadline_id").references(() => deadlines.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const focusSessions = sqliteTable("focus_sessions", {
  id: text("id").primaryKey(),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  startAt: text("start_at"),
  endAt: text("end_at"),
  durationMinutes: integer("duration_minutes").notNull(),
  status: text("status").notNull().default("planned"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const dailyPlans = sqliteTable("daily_plans", {
  id: text("id").primaryKey(),
  planDate: text("plan_date").notNull().unique(),
  status: text("status").notNull().default("draft"),
  summary: text("summary"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const timeBlocks = sqliteTable("time_blocks", {
  id: text("id").primaryKey(),
  dailyPlanId: text("daily_plan_id").references(() => dailyPlans.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(),
  endAt: text("end_at").notNull(),
  type: text("type").notNull().default("task"),
  status: text("status").notNull().default("planned"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const aiRecommendations = sqliteTable("ai_recommendations", {
  id: text("id").primaryKey(),
  recommendedTaskId: text("recommended_task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  goalId: text("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  reasonSummary: text("reason_summary").notNull(),
  riskSummary: text("risk_summary"),
  confidence: real("confidence").notNull().default(0.7),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at")
});

export const aiActivityLogs = sqliteTable("ai_activity_logs", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  summary: text("summary").notNull(),
  metadataJson: text("metadata_json"),
  createdAt: text("created_at").notNull()
});

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(),
  model: text("model").notNull(),
  inputJson: text("input_json").notNull(),
  outputJson: text("output_json"),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms").notNull().default(0),
  error: text("error"),
  createdAt: text("created_at").notNull()
});

export const aiActionProposals = sqliteTable("ai_action_proposals", {
  id: text("id").primaryKey(),
  intent: text("intent").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  confirmedAt: text("confirmed_at")
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  valueJson: text("value_json").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const dailyReviews = sqliteTable("daily_reviews", {
  id: text("id").primaryKey(),
  reviewDate: text("review_date").notNull().unique(),
  completedCount: integer("completed_count").notNull().default(0),
  unfinishedCount: integer("unfinished_count").notNull().default(0),
  energyValue: text("energy_value").notNull(),
  summary: text("summary").notNull(),
  reflection: text("reflection"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  proposalId: text("proposal_id"), // optional link to ai_action_proposals.id
  createdAt: text("created_at").notNull()
});

export const schema = {
  goals,
  projects,
  tasks,
  deadlines,
  calendarBlocks,
  calendarEvents,
  habits,
  habitLogs,
  reminders,
  focusSessions,
  dailyPlans,
  timeBlocks,
  aiRecommendations,
  aiActivityLogs,
  aiRuns,
  aiActionProposals,
  settings,
  dailyReviews,
  chatMessages
};
