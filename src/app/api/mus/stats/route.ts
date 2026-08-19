import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import type { MusLeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";


/**
 * Con muy pocas partidas el porcentaje engaña (1 de 1 = 100%), así que
 * quien no llega al mínimo se aparta a una lista provisional.
 */
const MIN_RANKED_GAMES = 4;

export async function GET() {
  await ensureSchema();

  const totalGames = await db.execute(
    "SELECT COUNT(*) as count FROM games WHERE game = 'mus' AND counts_for_stats = 1"
  );

  const leaderboard = await db.execute(`
    SELECT
      p.id, p.name, p.color,
      COUNT(gp.game_id) AS games_played,
      SUM(CASE WHEN gp.team = g.winner_team THEN 1 ELSE 0 END) AS wins
    FROM players p
    JOIN game_players gp ON gp.player_id = p.id
    JOIN games g ON g.id = gp.game_id AND g.game = 'mus' AND g.counts_for_stats = 1
    GROUP BY p.id
    HAVING games_played > 0
  `);

  // partidas de mus (que cuentan) ordenadas por fecha para calcular rachas por jugador
  const recentGames = await db.execute(`
    SELECT g.id, g.winner_team, g.created_at, gp.player_id, gp.team
    FROM games g
    JOIN game_players gp ON gp.game_id = g.id
    WHERE g.game = 'mus' AND g.counts_for_stats = 1
    ORDER BY g.created_at ASC
  `);

  const streaks = new Map<string, number>();
  const currentStreak = new Map<string, number>();
  const monthlyCounts = new Map<string, number>();
  const gameIdsSeen = new Set<string>();
  const currentYear = String(new Date().getFullYear());
  let gamesThisYear = 0;

  for (const row of recentGames.rows) {
    const playerId = String(row.player_id);
    const won = Number(row.team) === Number(row.winner_team);
    if (won) {
      currentStreak.set(playerId, (currentStreak.get(playerId) ?? 0) + 1);
      streaks.set(playerId, Math.max(streaks.get(playerId) ?? 0, currentStreak.get(playerId)!));
    } else {
      currentStreak.set(playerId, 0);
    }

    // cada partida aparece 4 veces (una por jugador); contarla una sola vez por game.id
    const gameId = String(row.id);
    if (!gameIdsSeen.has(gameId)) {
      gameIdsSeen.add(gameId);
      const createdAt = String(row.created_at);
      const month = createdAt.slice(0, 7); // "YYYY-MM"
      monthlyCounts.set(month, (monthlyCounts.get(month) ?? 0) + 1);
      if (createdAt.slice(0, 4) === currentYear) gamesThisYear += 1;
    }
  }

  const monthly = Array.from(monthlyCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  const leaderboardWithStreak: MusLeaderboardEntry[] = leaderboard.rows
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

  const ranked = leaderboardWithStreak.filter((p) => p.games_played >= MIN_RANKED_GAMES);
  const provisional = leaderboardWithStreak.filter((p) => p.games_played < MIN_RANKED_GAMES);

  return NextResponse.json({
    totalGames: Number(totalGames.rows[0].count),
    gamesThisYear,
    monthly,
    leaderboard: ranked,
    provisional,
    minRankedGames: MIN_RANKED_GAMES,
  });
}
