import type { AppData, AskResponse, NowBriefing, AppSettings, CalendarData, DeadlineRadar } from "./types";

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

export async function createTaskApi(task: any): Promise<any> {
  return requestJson("/api/tasks", "HelpMe could not create task.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(task)
  });
}

export async function updateTaskApi(taskId: string, task: any): Promise<any> {
  return requestJson(`/api/tasks/${taskId}`, "HelpMe could not update task.", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(task)
  });
}

export async function deleteTaskApi(taskId: string): Promise<any> {
  return requestJson(`/api/tasks/${taskId}`, "HelpMe could not delete task.", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function completeReminderApi(reminderId: string): Promise<any> {
  return requestJson(`/api/reminders/${reminderId}/complete`, "HelpMe could not complete this reminder.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function snoozeReminderApi(reminderId: string, minutes = 15): Promise<any> {
  return requestJson(`/api/reminders/${reminderId}/snooze`, "HelpMe could not snooze this reminder.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ minutes })
  });
}

export async function createReminderApi(reminder: any): Promise<any> {
  return requestJson("/api/reminders", "HelpMe could not create reminder.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(reminder)
  });
}

export async function deleteReminderApi(reminderId: string): Promise<any> {
  return requestJson(`/api/reminders/${reminderId}`, "HelpMe could not delete reminder.", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function fetchCalendarApi(mode = "day", startDate?: string): Promise<CalendarData> {
  const params = new URLSearchParams();
  params.append("mode", mode);
  if (startDate) {
    params.append("start_date", startDate);
  }
  return requestJson<CalendarData>(`/api/calendar?${params.toString()}`, "Unable to load calendar.");
}

export async function createCalendarEventApi(event: any): Promise<any> {
  return requestJson("/api/calendar/events", "HelpMe could not create event.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });
}

export async function updateCalendarEventApi(eventId: string, event: any): Promise<any> {
  return requestJson(`/api/calendar/events/${eventId}`, "HelpMe could not update event.", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });
}

export async function deleteCalendarEventApi(eventId: string): Promise<any> {
  return requestJson(`/api/calendar/events/${eventId}`, "HelpMe could not delete event.", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

export async function createTimeBlockApi(timeBlock: any): Promise<any> {
  return requestJson("/api/calendar/time-blocks", "HelpMe could not create time block.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(timeBlock)
  });
}

export async function updateTimeBlockApi(timeBlockId: string, timeBlock: any): Promise<any> {
  return requestJson(`/api/calendar/time-blocks/${timeBlockId}`, "HelpMe could not update time block.", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(timeBlock)
  });
}

export async function deleteTimeBlockApi(timeBlockId: string): Promise<any> {
  return requestJson(`/api/calendar/time-blocks/${timeBlockId}`, "HelpMe could not delete time block.", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
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

export async function fetchDeadlineRadarApi(): Promise<DeadlineRadar> {
  return requestJson<DeadlineRadar>("/api/deadlines", "Unable to load deadlines.");
}

export async function createDeadlineApi(deadline: any): Promise<any> {
  return requestJson("/api/deadlines", "HelpMe could not create deadline.", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(deadline)
  });
}

export async function updateDeadlineApi(deadlineId: string, deadline: any): Promise<any> {
  return requestJson(`/api/deadlines/${deadlineId}`, "HelpMe could not update deadline.", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(deadline)
  });
}

export async function deleteDeadlineApi(deadlineId: string): Promise<any> {
  return requestJson(`/api/deadlines/${deadlineId}`, "HelpMe could not delete deadline.", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });
}

async function requestJson<T>(url: string, errorMessage: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let errBody: any = null;
    try {
      errBody = await response.json();
    } catch (e) {
      // not JSON
    }
    if (errBody && typeof errBody === "object") {
      const err = new Error(errBody.error || errorMessage) as any;
      Object.assign(err, errBody);
      throw err;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
