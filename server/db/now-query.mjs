import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlannerDecision } from "../ai/planner.mjs";
import { sqlite } from "./client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..", "..");
const mockDataDir = join(rootDir, "server", "mock-data");

export async function buildNowBriefing() {
  const baseBriefing = await loadMockJson("now-briefing.json");
  const goals = selectGoals();
  const projects = selectProjects();
  const tasks = selectTasks();
  const deadlines = selectDeadlines();
  const planner = createPlannerDecision({ tasks, deadlines });
  const recommendedTask = tasks.find((task) => task.id === planner.selected_task_id) ?? tasks[0];
  const recommendedProject = projects.find((project) => project.id === recommendedTask?.project_id);
  const recommendedGoal = goals.find((goal) => goal.id === recommendedTask?.goal_id);

  return {
    ...baseBriefing,
    selection_tree: {
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        projects: projects
          .filter((project) => project.goal_id === goal.id)
          .map((project) => ({
            id: project.id,
            title: project.title,
            tasks: tasks
              .filter((task) => task.project_id === project.id)
              .map((task) => ({
                id: task.id,
                title: task.title,
                duration_minutes: task.estimated_minutes ?? 0,
                fits_available_time: Boolean(task.fits_available_time),
                ai_recommended: task.id === planner.selected_task_id
              }))
          }))
      }))
    },
    focus_path: {
      goal: {
        id: recommendedGoal?.id ?? baseBriefing.focus_path.goal.id,
        title: recommendedGoal?.title ?? baseBriefing.focus_path.goal.title
      },
      project: recommendedProject
        ? {
            id: recommendedProject.id,
            title: recommendedProject.title
          }
        : baseBriefing.focus_path.project,
      task: {
        id: recommendedTask?.id ?? baseBriefing.focus_path.task.id,
        title: recommendedTask?.title ?? baseBriefing.focus_path.task.title
      }
    },
    next_best_action: {
      ...baseBriefing.next_best_action,
      title: recommendedTask?.title ?? baseBriefing.next_best_action.title,
      task_id: recommendedTask?.id ?? baseBriefing.next_best_action.task_id,
      duration_minutes: recommendedTask?.estimated_minutes ?? baseBriefing.next_best_action.duration_minutes,
      linked_goal: recommendedGoal?.title ?? baseBriefing.next_best_action.linked_goal,
      metadata: {
        ...baseBriefing.next_best_action.metadata,
        fits_available_time: Boolean(recommendedTask?.fits_available_time)
      }
    },
    reason_summary: planner.reason_summary,
    risk_summary: planner.risk_summary,
    collapsed_summary: {
      ...baseBriefing.collapsed_summary,
      hidden_tasks_count: Math.max(tasks.filter((task) => task.status !== "inbox").length - 1, 0),
      watched_deadlines_count: countWatchedDeadlines(),
      open_tasks_count: tasks.filter((task) => task.status !== "inbox").length
    },
    planner: {
      mode: planner.mode,
      selected_task_id: planner.selected_task_id,
      score_breakdown: planner.rankings[0]?.score_breakdown ?? null,
      alternatives: planner.alternatives
    }
  };
}

function selectGoals() {
  return sqlite
    .prepare("SELECT id, title FROM goals WHERE status = 'active' ORDER BY priority DESC, created_at ASC")
    .all();
}

function selectProjects() {
  return sqlite
    .prepare("SELECT id, goal_id, title FROM projects WHERE status = 'active' ORDER BY priority DESC, created_at ASC")
    .all();
}

function selectTasks() {
  return sqlite
    .prepare(
      `SELECT t.id, t.goal_id, t.project_id, t.parent_task_id, t.title, t.status, t.priority,
        t.estimated_minutes, t.due_at, t.scheduled_start, t.fits_available_time,
        t.created_at, g.priority AS goal_priority, g.is_north_star
       FROM tasks t
       LEFT JOIN goals g ON g.id = t.goal_id
       WHERE t.status IN ('open', 'todo', 'doing', 'in_focus')
       ORDER BY t.priority DESC, t.created_at ASC`
    )
    .all();
}

function selectDeadlines() {
  return sqlite
    .prepare(
      "SELECT id, title, due_at, severity, status, goal_id, project_id, task_id FROM deadlines WHERE status IN ('active', 'watched', 'open') ORDER BY due_at ASC"
    )
    .all();
}

function countWatchedDeadlines() {
  const row = sqlite.prepare("SELECT COUNT(*) AS value FROM deadlines WHERE status IN ('active', 'watched')").get();
  return row?.value ?? 0;
}

async function loadMockJson(fileName) {
  return JSON.parse(await readFile(join(mockDataDir, fileName), "utf8"));
}
