import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

type Row = Record<string, unknown>;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;

  const playerRes = await db.execute({
    sql: "SELECT id, name, color FROM players WHERE id = ?",
    args: [id],
  });
  if (playerRes.rows.length === 0) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }
  const player = playerRes.rows[0];

  const gamesRes = await db.execute({
    sql: `
      SELECT g.id, g.winner_id, g.image, g.created_at
      FROM games g
      JOIN game_players gp ON gp.game_id = g.id
      WHERE gp.player_id = ?
      ORDER BY g.created_at ASC
    `,
    args: [id],
  });

  const gameIds = gamesRes.rows.map((g) => String(g.id));
  const byGame = new Map<string, { id: string; name: string; color: string }[]>();

  if (gameIds.length > 0) {
    const placeholders = gameIds.map(() => "?").join(",");
    const partRes = await db.execute({
      sql: `
        SELECT gp.game_id, pl.id, pl.name, pl.color
        FROM game_players gp
        JOIN players pl ON pl.id = gp.player_id
        WHERE gp.game_id IN (${placeholders})
      `,
      args: gameIds,
    });
    for (const row of partRes.rows as Row[]) {
      const key = String(row.game_id);
      if (!byGame.has(key)) byGame.set(key, []);
      byGame.get(key)!.push({ id: String(row.id), name: String(row.name), color: String(row.color) });
    }
  }

  const gamesPlayed = gamesRes.rows.length;
  const wins = gamesRes.rows.filter((g) => g.winner_id === id).length;

  let running = 0;
  let bestStreak = 0;
  for (const g of gamesRes.rows) {
    if (g.winner_id === id) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }
  const currentStreak = running;

  const rivalries = new Map<
    string,
    { id: string; name: string; color: string; together: number; myWins: number; theirWins: number }
  >();

  for (const g of gamesRes.rows) {
    const participants = byGame.get(String(g.id)) ?? [];
    for (const opponent of participants) {
      if (opponent.id === id) continue;
      if (!rivalries.has(opponent.id)) {
        rivalries.set(opponent.id, {
          id: opponent.id,
          name: opponent.name,
          color: opponent.color,
          together: 0,
          myWins: 0,
          theirWins: 0,
        });
      }
      const r = rivalries.get(opponent.id)!;
      r.together += 1;
      if (g.winner_id === id) r.myWins += 1;
      if (g.winner_id === opponent.id) r.theirWins += 1;
    }
  }

  const games = gamesRes.rows
    .slice()
    .reverse()
    .map((g) => ({
      id: String(g.id),
      winner_id: String(g.winner_id),
      image: g.image ? String(g.image) : null,
      created_at: String(g.created_at),
      players: byGame.get(String(g.id)) ?? [],
    }));

  return NextResponse.json({
    player,
    stats: {
      games_played: gamesPlayed,
      wins,
      win_rate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
      current_streak: currentStreak,
      best_streak: bestStreak,
    },
    rivalries: Array.from(rivalries.values()).sort((a, b) => b.together - a.together),
    games,
  });
}
