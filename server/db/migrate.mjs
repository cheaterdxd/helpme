import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sqlite } from "./client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "migrations");

export function migrateDatabase() {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, fileName), "utf8");
    sqlite.exec(sql);
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  migrateDatabase();
  console.log("Database migrated.");
}
