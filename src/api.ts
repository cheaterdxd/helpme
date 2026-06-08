import type { AppData, AskResponse, NowBriefing } from "./types";

export async function fetchNowBriefing(): Promise<NowBriefing> {
  return requestJson<NowBriefing>("/api/now", "Unable to load HelpMe briefing.");
}

export async function fetchAppData(): Promise<AppData> {
  const [today, tasks, calendar, deadlines, habits, goals, review, aiStatus] = await Promise.all([
    requestJson<AppData["today"]>("/api/today", "Unable to load Today."),
    requestJson<AppData["tasks"]>("/api/tasks", "Unable to load tasks."),
    requestJson<AppData["calendar"]>("/api/calendar", "Unable to load calendar."),
    requestJson<AppData["deadlines"]>("/api/deadlines", "Unable to load deadlines."),
    requestJson<AppData["habits"]>("/api/habits", "Unable to load habits."),
    requestJson<AppData["goals"]>("/api/goals", "Unable to load goals."),
    requestJson<AppData["review"]>("/api/review", "Unable to load review."),
    requestJson<AppData["aiStatus"]>("/api/ai/status", "Unable to load AI status.")
  ]);

  return {
    today,
    tasks,
    calendar,
    deadlines,
    habits,
    goals,
    review,
    aiStatus
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

async function requestJson<T>(url: string, errorMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
