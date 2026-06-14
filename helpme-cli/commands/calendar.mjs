import chalk from "chalk";
import { getCalendarView } from "../../server/db/app-queries.mjs";
import { calendarTable } from "../render/table.mjs";
import { header, divider } from "../render/box.mjs";

export async function handleCalendar() {
  const data = getCalendarView("day");

  const lines = [
    header(`📅  CALENDAR`, `Ngày: ${data.date}`),
    "",
    calendarTable(data)
  ];

  if (data.free_windows?.length) {
    lines.push("");
    lines.push(divider("KHUNG GIỜ TRỐNG"));
    for (const w of data.free_windows) {
      const time = `${w.start.slice(11, 16)} - ${w.end.slice(11, 16)}`;
      lines.push(`  ${chalk.green("○")} ${chalk.bold(time)}  ${chalk.gray(w.label ?? "")}`);
    }
  }

  return lines.join("\n");
}
