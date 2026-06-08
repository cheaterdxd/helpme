import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { schema } from "./schema.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..", "..");
const dataDir = join(rootDir, "data");
const defaultDbPath = join(dataDir, "helpme.sqlite");
const dbPath = process.env.HELPME_DB_PATH || defaultDbPath;

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { dbPath };
