import chalk from "chalk";
import { getGoalsOverview } from "../../server/db/app-queries.mjs";
import { goalsTable } from "../render/table.mjs";
import { header } from "../render/box.mjs";

export async function handleGoals() {
  const goals = getGoalsOverview();
  const active = goals.filter(g => g.status === "active");

  const lines = [
    header(`🎯  GOALS`, `${active.length} active · ${goals.length} tổng`),
    "",
    goalsTable(goals)
  ];

  return lines.join("\n");
}
