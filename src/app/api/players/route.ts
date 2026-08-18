import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { colorForIndex } from "@/lib/colors";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const result = await db.execute(`
    SELECT
      p.id,
      p.name,
      p.color,
      COUNT(gp.game_id) AS games_played,
      SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END) AS wins
    FROM players p
    LEFT JOIN game_players gp ON gp.player_id = p.id
    LEFT JOIN games g ON g.id = gp.game_id
    GROUP BY p.id
    ORDER BY p.name COLLATE NOCASE ASC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(request: Request) {
  await ensureSchema();
  const { name } = await request.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, name, color FROM players WHERE name = ?",
    args: [trimmed],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json(existing.rows[0]);
  }

  const countResult = await db.execute("SELECT COUNT(*) as count FROM players");
  const count = Number(countResult.rows[0].count);
  const id = crypto.randomUUID();
  const color = colorForIndex(count);

  await db.execute({
    sql: "INSERT INTO players (id, name, color) VALUES (?, ?, ?)",
    args: [id, trimmed, color],
  });

  return NextResponse.json({ id, name: trimmed, color }, { status: 201 });
}
