export type Route = "now" | "cli" | "today" | "inbox" | "calendar" | "deadlines" | "goals" | "habits" | "review" | "settings";

export const routeMeta: Record<Route, { label: string; hint: string }> = {
  now: { label: "Now", hint: "next" },
  cli: { label: "CLI OS", hint: "command terminal" },
  today: { label: "Today", hint: "timeline" },
  inbox: { label: "Inbox", hint: "capture" },
  calendar: { label: "Calendar", hint: "blocks" },
  deadlines: { label: "Deadlines", hint: "radar" },
  goals: { label: "Goals", hint: "north star" },
  habits: { label: "Habits", hint: "routine" },
  review: { label: "Review", hint: "reflect" },
  settings: { label: "Settings", hint: "behavior" }
};

