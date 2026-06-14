#!/usr/bin/env node
import readline from "node:readline";
import chalk from "chalk";

import { seedDatabase } from "../server/db/seed.mjs";
import { handleToday } from "./commands/today.mjs";
import { handleTasks } from "./commands/tasks.mjs";
import { handleHabits } from "./commands/habits.mjs";
import { handleGoals } from "./commands/goals.mjs";
import { handleDeadlines } from "./commands/deadlines.mjs";
import { handleCalendar } from "./commands/calendar.mjs";
import { handleAiMessage } from "./ai-handler.mjs";
import { handleModel } from "./commands/model.mjs";
import { systemMessage, errorMessage } from "./render/chat.mjs";
import { header } from "./render/box.mjs";

// ─── Boot ─────────────────────────────────────────────────────────────────────
await seedDatabase();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  prompt: chalk.bold.cyan("HelpMe") + chalk.gray(" › ") 
});

// ─── Welcome banner ───────────────────────────────────────────────────────────
console.clear();
console.log(header("🤖  HelpMe CLI", "Personal OS · Local-first · AI-powered"));
console.log();
console.log(systemMessage("Gõ lệnh tự nhiên hoặc dùng /today /tasks /habits /goals /deadlines /calendar"));
console.log(systemMessage("Gõ /help để xem toàn bộ lệnh · /exit để thoát"));
console.log();

rl.prompt();

// ─── Slash command map ────────────────────────────────────────────────────────
const SLASH_COMMANDS = {
  "/today":     handleToday,
  "/tasks":     handleTasks,
  "/habits":    handleHabits,
  "/goals":     handleGoals,
  "/deadlines": handleDeadlines,
  "/calendar":  handleCalendar,
  "/dl":        handleDeadlines,  // shortcut
};

const HELP_TEXT = `
${chalk.bold.cyan("Slash Commands:")}
  ${chalk.cyan("/today")}           — Tóm tắt ngày hôm nay, timeline, overload
  ${chalk.cyan("/tasks")}           — Danh sách tasks (Today / Inbox / Open / Done)
  ${chalk.cyan("/habits")}          — Thói quen, streak, lịch sử tuần
  ${chalk.cyan("/goals")}           — Mục tiêu & dự án, tiến độ
  ${chalk.cyan("/deadlines")}       — Radar deadline (quá hạn → sau này)
  ${chalk.cyan("/calendar")}        — Lịch hôm nay + khung giờ trống
  ${chalk.cyan("/model")}           — Xem model đang dùng + danh sách Ollama
  ${chalk.cyan("/model set <tên>")} — Đổi sang model khác
  ${chalk.cyan("/clear")}           — Xóa màn hình
  ${chalk.cyan("/help")}            — Hiện bảng này
  ${chalk.cyan("/exit")}            — Thoát

${chalk.bold.cyan("Chat tự nhiên (AI):")}
  ${chalk.gray("nhắc tôi 20h học AWS 1h")}
  ${chalk.gray("lên kế hoạch tối nay từ 20h đến 23h")}
  ${chalk.gray("sắp xếp inbox")}
  ${chalk.gray("chia nhỏ task học AWS")}
  ${chalk.gray("morning brief")}
  ${chalk.gray("tôi có đúng tiến độ không")}
`;

// ─── Main input loop ──────────────────────────────────────────────────────────
rl.on("line", async (rawInput) => {
  const input = rawInput.trim();

  if (!input) {
    rl.prompt();
    return;
  }

  const lower = input.toLowerCase();

  // Exit
  if (lower === "/exit" || lower === "/quit" || lower === "exit" || lower === "quit") {
    console.log(chalk.cyan("\n  Tạm biệt! 👋\n"));
    process.exit(0);
  }

  // Clear screen
  if (lower === "/clear" || lower === "/cls") {
    console.clear();
    rl.prompt();
    return;
  }

  // Help
  if (lower === "/help" || lower === "help" || lower === "?") {
    console.log(HELP_TEXT);
    rl.prompt();
    return;
  }

  // Slash command
  const handler = SLASH_COMMANDS[lower];
  if (handler) {
    try {
      const output = await handler();
      console.log();
      console.log(output);
      console.log();
    } catch (err) {
      console.log(errorMessage(`Lỗi: ${err.message}`));
    }
    rl.prompt();
    return;
  }

  // /model [set <name>] — has its own arg handling
  if (lower === "/model" || lower.startsWith("/model ")) {
    const args = input.slice("/model".length).trim().split(/\s+/).filter(Boolean);
    rl.pause();
    try {
      const output = await handleModel(args);
      console.log();
      console.log(output);
      console.log();
    } catch (err) {
      console.log(errorMessage(`Lỗi: ${err.message}`));
    }
    rl.resume();
    rl.prompt();
    return;
  }

  // Unknown slash command
  if (input.startsWith("/")) {
    console.log(errorMessage(`Không tìm thấy lệnh "${input}". Gõ /help để xem danh sách.`));
    rl.prompt();
    return;
  }

  // Natural language → AI
  // Pause readline so AI prompt doesn't interleave with output
  rl.pause();
  try {
    await handleAiMessage(input, rl);
  } catch (err) {
    console.log(errorMessage(`Lỗi AI: ${err.message}`));
  }
  console.log();
  rl.resume();
  rl.prompt();
});

rl.on("close", () => {
  console.log(chalk.cyan("\n  Tạm biệt! 👋\n"));
  process.exit(0);
});
