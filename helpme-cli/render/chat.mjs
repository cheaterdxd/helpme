import chalk from "chalk";

const WIDTH = 54;

export function userMessage(text) {
  const line = chalk.blue("─".repeat(WIDTH));
  const formatted = text.replace(/\*\*(.*?)\*\*/g, (_, p1) => chalk.bold(p1));
  return [
    line,
    chalk.white(formatted),
    line
  ].join("\n");
}

export function assistantMessage(text, label = "HelpMe") {
  const line = chalk.cyan("─".repeat(WIDTH));
  const formatted = text.replace(/\*\*(.*?)\*\*/g, (_, p1) => chalk.bold(p1));
  return [
    line,
    chalk.white(formatted),
    line
  ].join("\n");
}

export function pendingMessage() {
  return chalk.gray.italic("  ⏳ HelpMe đang suy nghĩ...");
}

export function systemMessage(text) {
  return chalk.gray.italic(`  ℹ  ${text}`);
}

export function errorMessage(text) {
  return chalk.red(`  ✗  ${text}`);
}

export function successMessage(text) {
  return chalk.green(`  ✓  ${text}`);
}


