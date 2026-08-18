import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();

  const totalGames = await db.execute(
    "SELECT COUNT(*) as count FROM games WHERE game = 'catan' AND counts_for_stats = 1"
  );

  const leaderboard = await db.execute(`
    SELECT
      p.id, p.name, p.color,
      COUNT(g.id) AS games_played,
      SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END) AS wins
    FROM players p
    LEFT JOIN game_players gp ON gp.player_id = p.id
    LEFT JOIN games g ON g.id = gp.game_id AND g.game = 'catan' AND g.counts_for_stats = 1
    GROUP BY p.id
    HAVING games_played > 0
  `);

  // partidas de catán (que cuentan) ordenadas por fecha para calcular rachas por jugador
  const recentGames = await db.execute(`
    SELECT g.id, g.winner_id, g.created_at, gp.player_id
    FROM games g
    JOIN game_players gp ON gp.game_id = g.id
    WHERE g.game = 'catan' AND g.counts_for_stats = 1
    ORDER BY g.created_at ASC, g.rowid ASC
  `);

  const streaks = new Map();
  const currentStreak = new Map();
  for (const row of recentGames.rows) {
    const playerId = String(row.player_id);
    const won = row.winner_id === row.player_id;
    if (won) {
      currentStreak.set(playerId, (currentStreak.get(playerId) ?? 0) + 1);
      streaks.set(playerId, Math.max(streaks.get(playerId) ?? 0, currentStreak.get(playerId)));
    } else {
      currentStreak.set(playerId, 0);
    }
  }

  const leaderboardWithStreak = leaderboard.rows
    .map((p) => {
      const gamesPlayed = Number(p.games_played);
      const wins = Number(p.wins);
      return {
        id: String(p.id),
        name: String(p.name),
        color: String(p.color),
        games_played: gamesPlayed,
        wins,
        win_rate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
        current_streak: currentStreak.get(String(p.id)) ?? 0,
        best_streak: streaks.get(String(p.id)) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.games_played - a.games_played;
    });

  return NextResponse.json({
    totalGames: Number(totalGames.rows[0].count),
    leaderboard: leaderboardWithStreak,
  });
}
