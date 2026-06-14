import chalk from "chalk";
import { getHabitDashboard } from "../../server/db/app-queries.mjs";
import { habitsTable } from "../render/table.mjs";
import { header } from "../render/box.mjs";

export async function handleHabits() {
  const habits = getHabitDashboard();
  const active = habits.filter(h => h.status === "active");

  const lines = [
    header(`🔁  HABITS`, `${active.length} đang theo dõi · ${habits.length} tổng`),
    "",
    habitsTable(habits)
  ];

  // Quick insights
  const streaking = habits.filter(h => h.streak >= 3);
  if (streaking.length) {
    lines.push("");
    lines.push(chalk.yellow(`  🔥 Đang duy trì chuỗi: ${streaking.map(h => h.title + " (" + h.streak + " ngày)").join(", ")}`));
  }

  return lines.join("\n");
}
