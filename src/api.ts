import type { AppData, AskResponse, NowBriefing, AppSettings } from "./types";

export async function fetchNowBriefing(): Promise<NowBriefing> {
  return requestJson<NowBriefing>("/api/now", "Unable to load HelpMe briefing.");
}

export async function fetchAppData(): Promise<AppData> {
  const [today, tasks, calendar, deadlines, habits, goals, review, aiStatus, settings] = await Promise.all([
    requestJson<AppData["today"]>("/api/today", "Unable to load Today."),
    requestJson<AppData["tasks"]>("/api/tasks", "Unable to load tasks."),
    requestJson<AppData["calendar"]>("/api/calendar", "Unable to load calendar."),
    requestJson<AppData["deadlines"]>("/api/deadlines", "Unable to load deadlines."),
    requestJson<AppData["habits"]>("/api/habits", "Unable to load habits."),
    requestJson<AppData["goals"]>("/api/goals", "Unable to load goals."),
    requestJson<AppData["review"]>("/api/review", "Unable to load review."),
    requestJson<AppData["aiStatus"]>("/api/ai/status", "Unable to load AI status."),
    requestJson<AppData["settings"]>("/api/settings", "Unable to load settings.")
  ]);

  return {
    today,
    tasks,
    calendar,
    deadlines,
    habits,
    goals,
    review,
    aiStatus,
    settings
  };
}

export async function askHelpMe(message: string): Promise<AskResponse> {
  return requestJson<AskResponse>("/api/ai/command", "HelpMe could not answer right now.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });
}

export async function confirmProposal(proposalId: string) {
  return requestJson(`/api/ai/proposals/${proposalId}/confirm`, "HelpMe could not confirm this proposal.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function rejectProposal(proposalId: string) {
  return requestJson(`/api/ai/proposals/${proposalId}/reject`, "HelpMe could not reject this proposal.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function completeTask(taskId: string) {
  return postEmpty(`/api/tasks/${taskId}/complete`, "HelpMe could not complete this task.");
}

export async function reopenTask(taskId: string) {
  return postEmpty(`/api/tasks/${taskId}/reopen`, "HelpMe could not reopen this task.");
}

export async function logHabitToday(habitId: string) {
  return postEmpty(`/api/habits/${habitId}/log`, "HelpMe could not log this habit.");
}

export async function startFocusSession(taskId: string) {
  return postEmpty(`/api/tasks/${taskId}/focus/start`, "HelpMe could not start focus.");
}

export async function completeFocusSession(sessionId: string, completeTask = false) {
  return requestJson(`/api/focus-sessions/${sessionId}/complete`, "HelpMe could not complete focus.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ complete_task: completeTask })
  });
}

export async function updateSettingsApi(settings: Partial<AppSettings>): Promise<AppSettings> {
  return requestJson<AppSettings>("/api/settings", "HelpMe could not update settings.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(settings)
  });
}

function postEmpty<T = unknown>(url: string, errorMessage: string) {
  return requestJson<T>(url, errorMessage, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

async function requestJson<T>(url: string, errorMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
