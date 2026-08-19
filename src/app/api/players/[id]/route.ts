import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { normalizeGame } from "@/lib/games";

type Row = Record<string, unknown>;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;

  const playerRes = await db.execute({
    sql: "SELECT id, name, color, game FROM players WHERE id = ?",
    args: [id],
  });
  if (playerRes.rows.length === 0) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }
  const playerRow = playerRes.rows[0];
  const game = normalizeGame(playerRow.game);
  const player = {
    id: String(playerRow.id),
    name: String(playerRow.name),
    color: String(playerRow.color),
  };

  const gamesRes = await db.execute({
    sql: `
      SELECT g.id, g.winner_id, g.winner_team, g.image, g.counts_for_stats, g.created_at, gp.team AS my_team
      FROM games g
      JOIN game_players gp ON gp.game_id = g.id
      WHERE gp.player_id = ? AND g.game = ?
      ORDER BY g.created_at ASC, g.rowid ASC
    `,
    args: [id, game],
  });

  // el historial (games) muestra TODAS las partidas, pero las estadísticas
  // (victorias, rachas, duelos) solo se calculan con las que cuentan.
  const countingRows = gamesRes.rows.filter((g) => Number(g.counts_for_stats) === 1);

  const gameIds = gamesRes.rows.map((g) => String(g.id));
  const byGame = new Map<string, { id: string; name: string; color: string; team: number | null }[]>();

  if (gameIds.length > 0) {
    const placeholders = gameIds.map(() => "?").join(",");
    const partRes = await db.execute({
      sql: `
        SELECT gp.game_id, gp.team, pl.id, pl.name, pl.color
        FROM game_players gp
        JOIN players pl ON pl.id = gp.player_id
        WHERE gp.game_id IN (${placeholders})
      `,
      args: gameIds,
    });
    for (const row of partRes.rows as Row[]) {
      const key = String(row.game_id);
      if (!byGame.has(key)) byGame.set(key, []);
      byGame.get(key)!.push({
        id: String(row.id),
        name: String(row.name),
        color: String(row.color),
        team: row.team === null || row.team === undefined ? null : Number(row.team),
      });
    }
  }

  // en mus ganas si tu equipo es el ganador; en catán, si eres el ganador
  const didWin = (g: Row) =>
    game === "mus"
      ? Number(g.my_team) === Number(g.winner_team)
      : String(g.winner_id) === id;

  let gamesPlayed = countingRows.length;
  let wins = countingRows.filter((g) => didWin(g as Row)).length;

  let running = 0;
  let bestStreak = 0;
  for (const g of countingRows) {
    if (didWin(g as Row)) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 0;
    }
  }
  const currentStreak = running;

  // temporadas anteriores a la app: se suman al total, pero no aportan
  // rachas ni duelos porque no guardamos el detalle de esas partidas.
  const legacyRes = await db.execute({
    sql: "SELECT SUM(games_played) AS games_played, SUM(wins) AS wins FROM legacy_stats WHERE game = ? AND player_id = ?",
    args: [game, id],
  });
  const legacyGames = Number(legacyRes.rows[0]?.games_played ?? 0);
  const legacyWins = Number(legacyRes.rows[0]?.wins ?? 0);
  gamesPlayed += legacyGames;
  wins += legacyWins;

  const rivalries = new Map<
    string,
    { id: string; name: string; color: string; together: number; myWins: number; theirWins: number }
  >();

  for (const g of countingRows) {
    const participants = byGame.get(String(g.id)) ?? [];
    const iWon = didWin(g as Row);
    for (const other of participants) {
      if (other.id === id) continue;
      // en mus, el rival es quien está en el equipo contrario (tu pareja no cuenta como duelo)
      if (game === "mus" && other.team === Number(g.my_team)) continue;
      if (!rivalries.has(other.id)) {
        rivalries.set(other.id, {
          id: other.id,
          name: other.name,
          color: other.color,
          together: 0,
          myWins: 0,
          theirWins: 0,
        });
      }
      const r = rivalries.get(other.id)!;
      r.together += 1;
      if (iWon) r.myWins += 1;
      else r.theirWins += 1;
    }
  }

  const games = gamesRes.rows
    .slice()
    .reverse()
    .map((g) => ({
      id: String(g.id),
      winner_id: String(g.winner_id),
      winner_team: g.winner_team === null || g.winner_team === undefined ? null : Number(g.winner_team),
      image: g.image ? String(g.image) : null,
      counts_for_stats: Number(g.counts_for_stats) === 1,
      created_at: String(g.created_at),
      players: byGame.get(String(g.id)) ?? [],
    }));

  return NextResponse.json({
    player,
    game,
    stats: {
      games_played: gamesPlayed,
      wins,
      win_rate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
      current_streak: currentStreak,
      best_streak: bestStreak,
      legacy_games: legacyGames,
      legacy_wins: legacyWins,
    },
    rivalries: Array.from(rivalries.values()).sort((a, b) => b.together - a.together),
    games,
  });
}
