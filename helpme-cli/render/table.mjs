import chalk from "chalk";
import Table from "cli-table3";

export function tasksTable(collections) {
  const all = [
    ...collections.today.map(t => ({ ...t, _group: "TODAY" })),
    ...collections.inbox.map(t => ({ ...t, _group: "INBOX" })),
    ...collections.open.map(t => ({ ...t, _group: "OPEN" })),
    ...collections.done.slice(0, 5).map(t => ({ ...t, _group: "DONE" }))
  ];

  if (!all.length) return chalk.gray("  Không có task nào.");

  const table = new Table({
    head: [
      chalk.bold.cyan(""),
      chalk.bold.cyan("Task"),
      chalk.bold.cyan("Status"),
      chalk.bold.cyan("Group"),
      chalk.bold.cyan("Est"),
      chalk.bold.cyan("Due / Start")
    ],
    colWidths: [3, 36, 10, 8, 6, 18],
    style: { border: ["gray"], head: [] },
    chars: {
      "top": "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
      "bottom": "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
      "left": "│", "left-mid": "├", "mid": "─", "mid-mid": "┼",
      "right": "│", "right-mid": "┤", "middle": "│"
    }
  });

  for (const task of all) {
    const statusColor = { done: "green", inbox: "blue", todo: "yellow", in_focus: "magenta" }[task.status] ?? "white";
    const dot = chalk[statusColor]("●");
    const title = task.title.length > 34 ? task.title.slice(0, 31) + "..." : task.title;
    const est = task.estimated_minutes ? `${task.estimated_minutes}m` : "─";
    const time = task.scheduled_start
      ? formatShortTime(task.scheduled_start)
      : task.due_at
        ? formatShortDate(task.due_at)
        : "─";
    const groupColor = { TODAY: "yellow", INBOX: "blue", OPEN: "white", DONE: "gray" }[task._group] ?? "white";
    table.push([dot, title, chalk[statusColor](task.status), chalk[groupColor](task._group), est, chalk.gray(time)]);
  }

  return table.toString();
}

export function habitsTable(habits) {
  if (!habits.length) return chalk.gray("  Không có thói quen nào.");

  const table = new Table({
    head: [
      chalk.bold.cyan("Habit"),
      chalk.bold.cyan("Status"),
      chalk.bold.cyan("Streak"),
      chalk.bold.cyan("Week"),
      chalk.bold.cyan("Rate")
    ],
    colWidths: [28, 8, 8, 16, 8],
    style: { border: ["gray"], head: [] },
    chars: standardChars()
  });

  for (const habit of habits) {
    const statusColor = habit.status === "active" ? "green" : "gray";
    const weekBar = habit.weekly_history.map(d => d ? chalk.green("■") : chalk.gray("□")).join("");
    const streakStr = habit.streak > 0 ? chalk.yellow(`🔥 ${habit.streak}`) : chalk.gray("0");
    const rate = `${habit.completion_rate}%`;
    const rateColor = habit.completion_rate >= 80 ? "green" : habit.completion_rate >= 50 ? "yellow" : "red";
    table.push([
      habit.title,
      chalk[statusColor](habit.status),
      streakStr,
      weekBar,
      chalk[rateColor](rate)
    ]);
  }

  return table.toString();
}

export function goalsTable(goals) {
  if (!goals.length) return chalk.gray("  Không có mục tiêu nào.");

  const lines = [];
  for (const goal of goals) {
    const star = goal.is_north_star ? chalk.yellow(" ⭐") : "";
    const prog = goal.progress;
    const progColor = prog === 100 ? "green" : prog >= 50 ? "yellow" : "red";
    const bar = progressBar(prog);
    lines.push(`  ${chalk.bold.white(goal.title)}${star}  ${chalk[progColor](bar)} ${prog}%`);

    for (const proj of (goal.projects ?? [])) {
      lines.push(`    ${chalk.gray("└─")} ${chalk.cyan(proj.title)} ${chalk.gray(`(${proj.tasks?.length ?? 0} tasks)`)}`);
    }
  }
  return lines.join("\n");
}

export function deadlinesTable(radar) {
  const lines = [];
  const groups = [
    { key: "overdue", label: "QUÁ HẠN", color: "red" },
    { key: "today", label: "HÔM NAY", color: "yellow" },
    { key: "this_week", label: "TUẦN NÀY", color: "cyan" },
    { key: "later", label: "SAU NÀY", color: "gray" }
  ];

  for (const { key, label, color } of groups) {
    const items = radar[key];
    if (!items?.length) continue;
    lines.push(chalk[color].bold(`\n  ● ${label}`));
    for (const d of items) {
      const due = d.due_at ? formatShortDate(d.due_at) : "─";
      const sev = d.severity === "high" ? chalk.red("[HIGH]") : d.severity === "medium" ? chalk.yellow("[MED]") : chalk.gray("[LOW]");
      lines.push(`    ${chalk[color]("─")} ${chalk.white(d.title)} ${sev} ${chalk.gray(due)}`);
    }
  }
  return lines.length ? lines.join("\n") : chalk.gray("  Không có deadline nào.");
}

export function calendarTable(calData) {
  const lines = [];
  const allSlots = [
    ...(calData.events ?? []).map(e => ({ title: e.title, start: e.start_at, end: e.end_at, type: "event" })),
    ...(calData.time_blocks ?? []).map(b => ({ title: b.title, start: b.start_at, end: b.end_at, type: b.type }))
  ].sort((a, b) => a.start.localeCompare(b.start));

  if (!allSlots.length) return chalk.gray("  Không có lịch nào hôm nay.");

  for (const slot of allSlots) {
    const time = `${formatShortTime(slot.start)} - ${formatShortTime(slot.end)}`;
    const typeColor = { event: "cyan", task: "yellow", break: "gray", review: "magenta" }[slot.type] ?? "white";
    const typeBadge = chalk[typeColor](`[${slot.type}]`);
    lines.push(`  ${chalk.bold(time)}  ${typeBadge}  ${chalk.white(slot.title)}`);
  }
  return lines.join("\n");
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatShortTime(iso) {
  return iso ? iso.slice(11, 16) : "─";
}

function formatShortDate(iso) {
  return iso ? iso.slice(0, 10) : "─";
}

function progressBar(pct, width = 10) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function standardChars() {
  return {
    "top": "─", "top-mid": "┬", "top-left": "┌", "top-right": "┐",
    "bottom": "─", "bottom-mid": "┴", "bottom-left": "└", "bottom-right": "┘",
    "left": "│", "left-mid": "├", "mid": "─", "mid-mid": "┼",
    "right": "│", "right-mid": "┤", "middle": "│"
  };
}
