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

  await migratePlayersPerGame();

  // ya con la columna `game` garantizada en cualquier caso
  await db.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name_game ON players(name, game)"
  );

  initialized = true;
}

// La tabla `players` original tenía UNIQUE(name) global, lo que impedía
// que el mismo nombre existiera en dos juegos distintos. Como SQLite no
// permite quitar una restricción UNIQUE con ALTER TABLE, hay que
// reconstruir la tabla.
async function migratePlayersPerGame() {
  const cols = await db.execute("PRAGMA table_info(players)");
  const hasGame = cols.rows.some((c) => String(c.name) === "game");
  if (hasGame) return;

  await db.batch(
    [
      `CREATE TABLE players_migrated (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        game TEXT NOT NULL DEFAULT 'catan',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // los jugadores que ya existían son todos de la etapa de Catán
      `INSERT INTO players_migrated (id, name, color, game, created_at)
       SELECT id, name, color, 'catan', created_at FROM players`,
      "DROP TABLE players",
      "ALTER TABLE players_migrated RENAME TO players",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_name_game ON players(name, game)",
    ],
    "write"
  );
}
