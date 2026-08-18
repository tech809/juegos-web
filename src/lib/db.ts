import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({ url, authToken });

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const schema = readFileSync(join(process.cwd(), "src/lib/schema.sql"), "utf-8");
  const statements = schema.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await db.execute(statement);
  }

  const migrations = [
    "ALTER TABLE games ADD COLUMN image TEXT",
    "ALTER TABLE games ADD COLUMN winner_team INTEGER",
    "ALTER TABLE game_players ADD COLUMN team INTEGER",
    "ALTER TABLE games ADD COLUMN counts_for_stats INTEGER NOT NULL DEFAULT 1",
  ];
  for (const migration of migrations) {
    try {
      await db.execute(migration);
    } catch {
      // ya existe la columna
    }
  }

  initialized = true;
}
