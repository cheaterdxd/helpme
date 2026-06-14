import chalk from "chalk";

// ─── Unicode box characters ───────────────────────────────────────────────────
const B = {
  tl: "╔", tr: "╗", bl: "╚", br: "╝",
  h: "═", v: "║",
  ml: "╠", mr: "╣", m: "═"
};

const B2 = {
  tl: "┌", tr: "┐", bl: "└", br: "┘",
  h: "─", v: "│",
  ml: "├", mr: "┤"
};

export function header(title, subtitle = "", width = 50) {
  const inner = width - 2;
  const titlePadded = title.padEnd(inner);
  const lines = [
    chalk.cyan(B.tl + B.h.repeat(inner) + B.tr),
    chalk.cyan(B.v) + chalk.bold.white(" " + titlePadded.slice(0, inner - 1)) + chalk.cyan(B.v),
  ];
  if (subtitle) {
    const subPadded = subtitle.padEnd(inner);
    lines.push(chalk.cyan(B.v) + chalk.gray(" " + subPadded.slice(0, inner - 1)) + chalk.cyan(B.v));
  }
  lines.push(chalk.cyan(B.bl + B.h.repeat(inner) + B.br));
  return lines.join("\n");
}

export function box(lines, opts = {}) {
  const { color = "blue", width = 52, label = "" } = opts;
  const c = chalk[color] ?? chalk.blue;
  const inner = width - 2;

  const topBorder = label
    ? B2.tl + B2.h.repeat(2) + " " + label + " " + B2.h.repeat(Math.max(0, inner - label.length - 4)) + B2.tr
    : B2.tl + B2.h.repeat(inner) + B2.tr;

  const result = [c(topBorder)];
  for (const line of lines) {
    const stripped = stripAnsi(line);
    const pad = Math.max(0, inner - 1 - stripped.length);
    result.push(c(B2.v) + " " + line + " ".repeat(pad) + c(B2.v));
  }
  result.push(c(B2.bl + B2.h.repeat(inner) + B2.br));
  return result.join("\n");
}

export function divider(label = "", width = 52) {
  if (!label) return chalk.gray("─".repeat(width));
  const padded = `─ ${label} `;
  return chalk.gray(padded + "─".repeat(Math.max(0, width - padded.length)));
}

export function badge(text, color = "blue") {
  const c = chalk[color] ?? chalk.blue;
  return c(`[${text}]`);
}

export function statusDot(status) {
  const map = {
    done: chalk.green("●"),
    todo: chalk.yellow("○"),
    inbox: chalk.blue("◌"),
    "in_focus": chalk.magenta("◉"),
    active: chalk.green("●"),
    paused: chalk.gray("●"),
    overdue: chalk.red("●"),
    today: chalk.yellow("●"),
    this_week: chalk.cyan("●"),
    later: chalk.gray("●"),
    pending: chalk.yellow("⬡"),
    confirmed: chalk.green("⬡"),
    rejected: chalk.red("⬡"),
  };
  return map[status] ?? chalk.gray("○");
}

export function urgencyBar(score, max = 100) {
  const filled = Math.round((score / max) * 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  if (score > 70) return chalk.red(bar);
  if (score > 40) return chalk.yellow(bar);
  return chalk.green(bar);
}

// strip ANSI color codes for length calculation
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, "");
}
