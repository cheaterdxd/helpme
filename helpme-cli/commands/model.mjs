import chalk from "chalk";
import { sqlite } from "../../server/db/client.mjs";

const defaultBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

function getSetting(key, fallback) {
  try {
    const row = sqlite.prepare("SELECT value_json FROM settings WHERE key = ?").get(key);
    if (row) return JSON.parse(row.value_json);
  } catch {}
  return fallback;
}

function setSetting(key, value) {
  const existing = sqlite.prepare("SELECT key FROM settings WHERE key = ?").get(key);
  if (existing) {
    sqlite.prepare("UPDATE settings SET value_json = ?, updated_at = ? WHERE key = ?")
      .run(JSON.stringify(value), new Date().toISOString(), key);
  } else {
    sqlite.prepare("INSERT INTO settings (key, value_json, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(key, JSON.stringify(value), new Date().toISOString(), new Date().toISOString());
  }
}

async function fetchAvailableModels() {
  try {
    const res = await fetch(`${defaultBaseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const body = await res.json();
    return Array.isArray(body.models) ? body.models.map(m => m.name) : [];
  } catch {
    return null;
  }
}

export async function handleModel(args) {
  const current = getSetting("preferred_model", process.env.OLLAMA_MODEL || "qwen3:1.7b");

  // /model set <name>
  if (args[0] === "set" && args[1]) {
    const newModel = args[1];
    setSetting("preferred_model", newModel);
    return chalk.green(`  ✓  Model đã đổi thành: ${chalk.bold(newModel)}\n`) +
           chalk.gray("     Hiệu lực ngay với lệnh tiếp theo.");
  }

  // /model list hoặc /model
  const lines = [];
  lines.push(chalk.bold.cyan("  Model hiện tại: ") + chalk.bold.white(current));
  lines.push("");

  const models = await fetchAvailableModels();

  if (!models) {
    lines.push(chalk.red("  ✗  Ollama chưa chạy hoặc không thể kết nối."));
    lines.push(chalk.gray(`     Chạy: ollama serve`));
  } else if (models.length === 0) {
    lines.push(chalk.yellow("  ⚠  Ollama đang chạy nhưng chưa có model nào được pull."));
    lines.push(chalk.gray("     Chạy: ollama pull qwen3:1.7b"));
  } else {
    lines.push(chalk.bold("  Models đã cài trên Ollama:"));
    for (const m of models) {
      const active = m === current ? chalk.green(" ← đang dùng") : "";
      lines.push(`    ${chalk.cyan("•")} ${chalk.white(m)}${active}`);
    }
    lines.push("");
    lines.push(chalk.gray("  Dùng: /model set <tên-model>  để đổi model"));
  }

  return lines.join("\n");
}
