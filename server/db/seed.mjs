import { count } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aiActivityLogs,
  aiActionProposals,
  aiRecommendations,
  aiRuns,
  calendarBlocks,
  calendarEvents,
  dailyPlans,
  deadlines,
  focusSessions,
  goals,
  habitLogs,
  habits,
  projects,
  reminders,
  settings,
  tasks,
  timeBlocks,
  dailyReviews
} from "./schema.mjs";
import { db, sqlite } from "./client.mjs";
import { migrateDatabase } from "./migrate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..", "..");
const mockDataDir = join(rootDir, "server", "mock-data");
const now = "2026-06-08T20:00:00+07:00";
const today = "2026-06-08";

const taskSeedById = {
  task_helpme_ux: {
    priority: 95,
    dueAt: "2026-06-08T23:00:00+07:00",
    scheduledStart: "2026-06-08T20:15:00+07:00",
    scheduledEnd: "2026-06-08T21:45:00+07:00",
    status: "todo"
  },
  task_archive_placeholder: { priority: 58, status: "todo" },
  task_review_placeholder: { priority: 56, status: "todo" },
  task_mock_api: { priority: 68, status: "todo" },
  task_mock_data: { priority: 52, status: "todo" },
  task_clear_inbox: { priority: 45, scheduledStart: "2026-06-08T22:20:00+07:00", scheduledEnd: "2026-06-08T22:40:00+07:00", status: "todo" },
  task_short_review: { priority: 40, scheduledStart: "2026-06-08T22:45:00+07:00", scheduledEnd: "2026-06-08T23:00:00+07:00", status: "todo" },
  task_read_notes: { priority: 76, dueAt: "2026-06-10T21:00:00+07:00", status: "todo" },
  task_practice_questions: { priority: 72, dueAt: "2026-06-11T21:00:00+07:00", status: "todo" }
};

export async function seedDatabase({ reset = false } = {}) {
  migrateDatabase();

  const [{ value: goalCount }] = await db.select({ value: count() }).from(goals);
  if (!reset && goalCount > 0) {
    return { seeded: false, reason: "database already contains goals" };
  }

  const nowBriefing = await loadMockJson("now-briefing.json");
  const goalDetails = await loadMockJson("goals.json");
  const deadlineRows = await loadMockJson("deadlines.json");
  const calendarRows = await loadMockJson("calendar-blocks.json");
  const appSettings = await loadMockJson("settings.json");
  const activityRows = await loadMockJson("ai-activity-log.json");

  sqlite.transaction(() => {
    clearTables();

    const goalDetailById = new Map(goalDetails.map((goal) => [goal.id, goal]));

    for (const goal of nowBriefing.selection_tree.goals) {
      const goalDetail = goalDetailById.get(goal.id);
      db.insert(goals).values({
        id: goal.id,
        title: goal.title,
        description: goalDetail?.description ?? null,
        status: goalDetail?.status ?? "active",
        priority: goal.id === nowBriefing.focus_path.goal.id ? 100 : 50,
        isNorthStar: Boolean(goalDetail?.north_star),
        createdAt: now,
        updatedAt: now
      }).run();

      for (const project of goal.projects) {
        db.insert(projects).values({
          id: project.id,
          goalId: goal.id,
          title: project.title,
          description: null,
          status: "active",
          priority: project.id === nowBriefing.focus_path.project?.id ? 100 : 50,
          createdAt: now,
          updatedAt: now
        }).run();

        for (const task of project.tasks) {
          const taskSeed = taskSeedById[task.id] ?? {};
          db.insert(tasks).values({
            id: task.id,
            goalId: goal.id,
            projectId: project.id,
            parentTaskId: null,
            title: task.title,
            description: null,
            status: taskSeed.status ?? "todo",
            priority: taskSeed.priority ?? (task.ai_recommended ? 100 : 50),
            estimatedMinutes: task.duration_minutes,
            dueAt: taskSeed.dueAt ?? null,
            scheduledStart: taskSeed.scheduledStart ?? null,
            scheduledEnd: taskSeed.scheduledEnd ?? null,
            fitsAvailableTime: Boolean(task.fits_available_time),
            visibleInNow: task.id === nowBriefing.next_best_action.task_id,
            createdAt: now,
            updatedAt: now
          }).run();
        }
      }
    }

    for (const deadline of deadlineRows) {
      db.insert(deadlines).values({
        id: deadline.id,
        title: deadline.title,
        dueAt: deadline.due_date,
        severity: deadline.severity,
        status: deadline.status,
        goalId: deadline.linked_goal_id ?? null,
        projectId: deadline.linked_project_id ?? null,
        taskId: deadline.linked_task_id ?? null,
        createdAt: now,
        updatedAt: now
      }).run();
    }

    seedSupplementalTasks();

    for (const block of calendarRows) {
      db.insert(calendarBlocks).values({
        id: block.id,
        title: block.title,
        type: block.type,
        startAt: block.start,
        endAt: block.end,
        taskId: block.task_id ?? null,
        source: block.source ?? "manual",
        createdAt: now,
        updatedAt: now
      }).run();
    }

    seedPersonalOsRows();

    db.insert(aiRecommendations).values({
      id: "rec_current_now",
      recommendedTaskId: nowBriefing.next_best_action.task_id,
      goalId: nowBriefing.focus_path.goal.id,
      projectId: nowBriefing.focus_path.project?.id ?? null,
      reasonSummary: nowBriefing.reason_summary,
      riskSummary: nowBriefing.risk_summary,
      confidence: 0.86,
      status: "active",
      createdAt: now,
      expiresAt: null
    }).run();

    for (const activity of activityRows) {
      db.insert(aiActivityLogs).values({
        id: activity.id,
        eventType: activity.event,
        summary: activity.summary,
        metadataJson: activity.metadata ? JSON.stringify(activity.metadata) : null,
        createdAt: activity.created_at
      }).run();
    }

    for (const [key, value] of Object.entries(appSettings)) {
      db.insert(settings).values({
        id: `setting_${key}`,
        key,
        valueJson: JSON.stringify(value),
        updatedAt: now
      }).run();
    }
  })();

  return { seeded: true };
}

function clearTables() {
  db.delete(aiActionProposals).run();
  db.delete(aiRuns).run();
  db.delete(aiActivityLogs).run();
  db.delete(aiRecommendations).run();
  db.delete(timeBlocks).run();
  db.delete(dailyPlans).run();
  db.delete(focusSessions).run();
  db.delete(reminders).run();
  db.delete(habitLogs).run();
  db.delete(habits).run();
  db.delete(calendarEvents).run();
  db.delete(calendarBlocks).run();
  db.delete(deadlines).run();
  db.delete(tasks).run();
  db.delete(projects).run();
  db.delete(goals).run();
  db.delete(settings).run();
  db.delete(dailyReviews).run();
}

function seedSupplementalTasks() {
  const inboxRows = [
    {
      id: "task_inbox_aws_whitepaper",
      goalId: "goal_learning",
      projectId: "project_aws_security",
      title: "Read AWS whitepaper",
      description: "Unsorted learning note captured from inbox.",
      priority: 62,
      estimatedMinutes: 45
    },
    {
      id: "task_inbox_helpme_report",
      goalId: "goal_helpme_ai_life_admin",
      projectId: "project_helpme_mvp_ui",
      title: "Draft HelpMe product reset note",
      description: "Clarify that goal.md is the completion target.",
      priority: 74,
      estimatedMinutes: 35
    },
    {
      id: "task_inbox_buy_notebook",
      goalId: "goal_personal_focus",
      projectId: "project_evening_reset",
      title: "Buy notebook",
      description: "Small personal task captured without scheduling.",
      priority: 18,
      estimatedMinutes: 15
    }
  ];

  for (const task of inboxRows) {
    db.insert(tasks).values({
      ...task,
      parentTaskId: null,
      status: "inbox",
      dueAt: null,
      scheduledStart: null,
      scheduledEnd: null,
      fitsAvailableTime: true,
      visibleInNow: false,
      createdAt: now,
      updatedAt: now
    }).run();
  }
}

function seedPersonalOsRows() {
  const events = [
    {
      id: "event_evening_focus",
      title: "HelpMe focus window",
      startAt: "2026-06-08T20:00:00+07:00",
      endAt: "2026-06-08T21:45:00+07:00",
      location: null,
      source: "ai_generated",
      linkedTaskId: "task_helpme_ux"
    },
    {
      id: "event_evening_review",
      title: "Evening review",
      startAt: "2026-06-08T22:45:00+07:00",
      endAt: "2026-06-08T23:00:00+07:00",
      location: null,
      source: "manual",
      linkedTaskId: "task_short_review"
    }
  ];

  for (const event of events) {
    db.insert(calendarEvents).values({
      ...event,
      createdAt: now,
      updatedAt: now
    }).run();
  }

  const habitRows = [
    { id: "habit_study_aws", title: "Study AWS", frequency: "weekly", targetCount: 5, streak: 3 },
    { id: "habit_workout", title: "Workout", frequency: "weekly", targetCount: 3, streak: 1 },
    { id: "habit_daily_review", title: "Daily review", frequency: "daily", targetCount: 1, streak: 5 }
  ];

  for (const habit of habitRows) {
    db.insert(habits).values({
      ...habit,
      status: "active",
      createdAt: now,
      updatedAt: now
    }).run();
  }

  const habitLogRows = [
    { id: "habit_log_aws_1", habitId: "habit_study_aws", logDate: "2026-06-06", value: 1, note: "Read notes" },
    { id: "habit_log_aws_2", habitId: "habit_study_aws", logDate: "2026-06-07", value: 1, note: "Practice questions" },
    { id: "habit_log_review_today", habitId: "habit_daily_review", logDate: today, value: 1, note: "Planned evening review" },
    { id: "habit_log_workout_1", habitId: "habit_workout", logDate: "2026-06-04", value: 1, note: "Short workout" }
  ];

  for (const log of habitLogRows) {
    db.insert(habitLogs).values({
      ...log,
      createdAt: now
    }).run();
  }

  db.insert(dailyPlans).values({
    id: "daily_plan_2026_06_08",
    planDate: today,
    status: "draft",
    summary: "Evening plan keeps HelpMe rebuild work first, then cleanup and review.",
    createdAt: now,
    updatedAt: now
  }).run();

  const timeBlockRows = [
    {
      id: "time_block_helpme_focus",
      dailyPlanId: "daily_plan_2026_06_08",
      taskId: "task_helpme_ux",
      title: "Finalize HelpMe operating-system direction",
      startAt: "2026-06-08T20:15:00+07:00",
      endAt: "2026-06-08T21:45:00+07:00",
      type: "task"
    },
    {
      id: "time_block_break",
      dailyPlanId: "daily_plan_2026_06_08",
      taskId: null,
      title: "Break",
      startAt: "2026-06-08T21:45:00+07:00",
      endAt: "2026-06-08T22:00:00+07:00",
      type: "break"
    },
    {
      id: "time_block_inbox",
      dailyPlanId: "daily_plan_2026_06_08",
      taskId: "task_clear_inbox",
      title: "Clear inbox",
      startAt: "2026-06-08T22:20:00+07:00",
      endAt: "2026-06-08T22:40:00+07:00",
      type: "task"
    },
    {
      id: "time_block_review",
      dailyPlanId: "daily_plan_2026_06_08",
      taskId: "task_short_review",
      title: "Review day",
      startAt: "2026-06-08T22:45:00+07:00",
      endAt: "2026-06-08T23:00:00+07:00",
      type: "review"
    }
  ];

  for (const block of timeBlockRows) {
    db.insert(timeBlocks).values({
      ...block,
      status: "planned",
      createdAt: now,
      updatedAt: now
    }).run();
  }

  db.insert(reminders).values({
    id: "reminder_helpme_direction",
    title: "Finish HelpMe direction before coding more UI",
    remindAt: "2026-06-08T21:30:00+07:00",
    status: "scheduled",
    taskId: "task_helpme_ux",
    deadlineId: "deadline_helpme_direction",
    createdAt: now,
    updatedAt: now
  }).run();

  db.insert(focusSessions).values({
    id: "focus_helpme_90m",
    taskId: "task_helpme_ux",
    title: "HelpMe operating-system rebuild",
    startAt: null,
    endAt: null,
    durationMinutes: 90,
    status: "planned",
    createdAt: now,
    updatedAt: now
  }).run();
}

async function loadMockJson(fileName) {
  return JSON.parse(await readFile(join(mockDataDir, fileName), "utf8"));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  const reset = process.argv.includes("--reset");
  const result = await seedDatabase({ reset });
  console.log(result.seeded ? "Database seeded." : `Seed skipped: ${result.reason}`);
}
