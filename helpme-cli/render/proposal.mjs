import chalk from "chalk";
import readline from "node:readline";

export async function renderProposal(proposal, rl) {
  const lines = buildProposalLines(proposal);
  const width = 54;
  const inner = width - 2;

  console.log();
  console.log(chalk.yellow("┌─ PROPOSAL: " + proposal.intent + " " + "─".repeat(Math.max(0, inner - proposal.intent.length - 12)) + "┐"));
  console.log(chalk.yellow("│") + " " + chalk.bold.white(proposal.title.slice(0, inner - 1)).padEnd(inner - 1) + chalk.yellow("│"));
  console.log(chalk.yellow("│") + " " + chalk.gray(proposal.summary.slice(0, inner - 1)).padEnd(inner - 1) + chalk.yellow("│"));

  if (lines.length) {
    console.log(chalk.yellow("├" + "─".repeat(inner) + "┤"));
    for (const line of lines) {
      const stripped = line.replace(/\x1B\[[0-9;]*m/g, "");
      const pad = Math.max(0, inner - 1 - stripped.length);
      console.log(chalk.yellow("│") + " " + line + " ".repeat(pad) + chalk.yellow("│"));
    }
  }

  console.log(chalk.yellow("└" + "─".repeat(inner) + "┘"));
  console.log();

  const answer = await askConfirm(rl, chalk.bold("Xác nhận thực hiện? ") + chalk.gray("[Y/n]") + ": ");
  return answer;
}

async function askConfirm(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === "" || trimmed === "y" || trimmed === "yes");
    });
  });
}

function buildProposalLines(proposal) {
  const lines = [];
  const payload = proposal.payload ?? {};

  if (proposal.intent === "plan_day" && Array.isArray(payload.blocks)) {
    for (const block of payload.blocks.slice(0, 6)) {
      const time = `${formatTime(block.start_at)} - ${formatTime(block.end_at)}`;
      const typeColor = block.type === "break" ? "gray" : "yellow";
      lines.push(`${chalk.cyan(time)}  ${chalk[typeColor](block.title)}`);
    }
    if (payload.blocks.length > 6) lines.push(chalk.gray(`  ... và ${payload.blocks.length - 6} khung giờ khác`));
  }

  if (proposal.intent === "create_task") {
    const title = payload.title ?? "(không tiêu đề)";
    const start = payload.scheduled_start ? formatTime(payload.scheduled_start) : "Inbox";
    const est = payload.estimated_minutes ? `${payload.estimated_minutes}m` : "";
    const conflicts = payload.validation?.conflict_count ?? 0;
    lines.push(`${chalk.yellow("📋")} ${chalk.white(title)}`);
    lines.push(`${chalk.cyan("⏰")} ${start}  ${chalk.gray(est)}`);
    if (conflicts > 0) lines.push(chalk.red(`⚠  ${conflicts} xung đột lịch!`));
  }

  if (proposal.intent === "create_reminder") {
    const title = payload.title ?? "(không tiêu đề)";
    const at = payload.remind_at ? `${formatDate(payload.remind_at)} ${formatTime(payload.remind_at)}` : "Ngay bây giờ";
    lines.push(`${chalk.yellow("🔔")} ${chalk.white(title)}`);
    lines.push(`${chalk.cyan("⏰")} ${at}`);
  }

  if (proposal.intent === "organize_inbox" && Array.isArray(payload.actions)) {
    const groups = {};
    for (const a of payload.actions) {
      if (!groups[a.group]) groups[a.group] = [];
      groups[a.group].push(a.title);
    }
    for (const [grp, titles] of Object.entries(groups)) {
      lines.push(chalk.cyan(`[${grp}]`) + " " + titles.slice(0, 3).join(", "));
    }
  }

  if (proposal.intent === "reschedule_task") {
    const title = payload.title ?? "(task)";
    const start = payload.scheduled_start ? formatTime(payload.scheduled_start) : "─";
    const conflicts = payload.validation?.conflict_count ?? 0;
    lines.push(`${chalk.yellow("↩")} ${chalk.white(title)}`);
    lines.push(`${chalk.cyan("⏰")} ${start}`);
    if (conflicts > 0) lines.push(chalk.red(`⚠  ${conflicts} xung đột lịch!`));
  }

  if (proposal.intent === "daily_review" && Array.isArray(payload.reschedule)) {
    for (const item of payload.reschedule.slice(0, 4)) {
      lines.push(`${chalk.gray("→")} ${chalk.white(item.title)} ${chalk.gray(formatDate(item.suggested_start))}`);
    }
  }

  if (proposal.intent === "create_routine") {
    const tasks = (payload.tasks ?? []).length;
    const blocks = (payload.time_blocks ?? []).length;
    const habits = (payload.habits ?? []).length;
    lines.push(`${chalk.yellow("📋")} ${tasks} tasks  ${chalk.cyan("⏱")} ${blocks} time blocks  ${chalk.green("🔁")} ${habits} habits`);
  }

  if (proposal.intent === "breakdown_goal" || proposal.intent === "breakdown_task") {
    const tasks = payload.tasks ?? [];
    for (const t of tasks.slice(0, 5)) {
      lines.push(`${chalk.gray("•")} ${chalk.white(t.title)} ${chalk.gray(`(${t.estimated_minutes ?? 30}m)`)}`);
    }
  }

  if (proposal.intent === "create_event") {
    const title = payload.title ?? "(sự kiện)";
    const start = payload.start_at ? formatTime(payload.start_at) : "─";
    const end = payload.end_at ? formatTime(payload.end_at) : "─";
    lines.push(`${chalk.cyan("📅")} ${chalk.white(title)}`);
    lines.push(`${chalk.cyan("⏰")} ${start} - ${end}`);
  }

  return lines;
}

function formatTime(iso) {
  return iso ? iso.slice(11, 16) : "─";
}

function formatDate(iso) {
  return iso ? iso.slice(0, 10) : "─";
}
