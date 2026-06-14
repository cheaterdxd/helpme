import chalk from "chalk";
import { getTodayView } from "../../server/db/app-queries.mjs";
import { header, box, divider } from "../render/box.mjs";

export async function handleToday() {
  const data = getTodayView();
  const lines = [];

  // ─── Summary ───────────────────────────────────────────────────────────────
  const s = data.summary;
  lines.push(header(`📅  ${data.date}`, data.greeting));
  lines.push("");
  lines.push(box([
    `${chalk.yellow("📋")} Open tasks    ${chalk.bold.white(s.open_tasks)}    ${chalk.blue("📥")} Inbox  ${chalk.bold.white(s.inbox_count)}`,
    `${chalk.red("⚠")}  Overdue       ${chalk.bold.white(s.overdue)}    ${chalk.cyan("📅")} Events ${chalk.bold.white(s.events_today)}`,
    `${chalk.green("⏱")}  Planned       ${chalk.bold.white(s.planned_minutes + "m")}  ${chalk.gray("/")}  Available ${chalk.bold.white(s.available_minutes + "m")}`
  ], { color: "cyan", width: 54, label: "SUMMARY" }));

  // ─── Overload ──────────────────────────────────────────────────────────────
  const overloadColor = { clear: "green", watch: "yellow", high: "red" }[data.overload.level] ?? "white";
  lines.push("");
  lines.push(chalk[overloadColor](`  ● Overload: ${data.overload.level.toUpperCase()} — ${data.overload.message}`));

  // ─── Suggested focus ───────────────────────────────────────────────────────
  if (data.suggested_focus) {
    const f = data.suggested_focus;
    lines.push("");
    lines.push(divider("FOCUS ĐỀ XUẤT"));
    lines.push(`  ${chalk.bold.yellow("⚡")} ${chalk.bold.white(f.title)}`);
    lines.push(`     ${chalk.gray(`${f.duration_minutes}m · Score ${f.score} · ${f.reason}`)}`);
    if (f.goal_title) lines.push(`     ${chalk.gray(`Goal: ${f.goal_title}`)}`);
  }

  // ─── Timeline ─────────────────────────────────────────────────────────────
  if (data.timeline?.length) {
    lines.push("");
    lines.push(divider("TIMELINE"));
    for (const slot of data.timeline) {
      const time = `${slot.start.slice(11, 16)} - ${slot.end.slice(11, 16)}`;
      const typeColor = { event: "cyan", task: "yellow", break: "gray", review: "magenta" }[slot.type] ?? "white";
      lines.push(`  ${chalk.bold(time)}  ${chalk[typeColor]("[" + slot.type + "]")}  ${chalk.white(slot.title)}`);
    }
  }

  // ─── Reminders ────────────────────────────────────────────────────────────
  if (data.reminders?.length) {
    lines.push("");
    lines.push(divider("NHẮC NHỞ"));
    for (const r of data.reminders) {
      lines.push(`  ${chalk.yellow("🔔")} ${chalk.white(r.title)} ${chalk.gray(r.remind_at?.slice(11, 16) ?? "")}`);
    }
  }

  return lines.join("\n");
}
