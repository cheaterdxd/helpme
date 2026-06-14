import chalk from "chalk";
import { getDeadlineRadar } from "../../server/db/app-queries.mjs";
import { deadlinesTable } from "../render/table.mjs";
import { header } from "../render/box.mjs";

export async function handleDeadlines() {
  const radar = getDeadlineRadar();
  const overdueCount = radar.overdue?.length ?? 0;
  const todayCount = radar.today?.length ?? 0;

  const lines = [
    header(
      `⏳  DEADLINE RADAR`,
      `Quá hạn: ${overdueCount}  Hôm nay: ${todayCount}  Tuần này: ${radar.this_week?.length ?? 0}  Sau: ${radar.later?.length ?? 0}`
    ),
    "",
    deadlinesTable(radar)
  ];

  if (overdueCount > 0) {
    lines.push("");
    lines.push(chalk.red.bold(`  ⚠  Có ${overdueCount} deadline quá hạn cần xử lý gấp!`));
  }

  return lines.join("\n");
}
