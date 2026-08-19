import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

type LeaderboardRow = {
  id: string;
  name: string;
  color: string;
  games_played: number;
  wins: number;
  win_rate: number;
  current_streak: number;
  best_streak: number;
};

function sortLeaderboard(rows: LeaderboardRow[]) {
  return rows.sort((a, b) => {
    if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.games_played - a.games_played;
  });
}

async function getRealYearStats(year: string) {
  const totalGames = await db.execute({
    sql: "SELECT COUNT(*) as count FROM games WHERE game = 'catan' AND counts_for_stats = 1 AND strftime('%Y', created_at) = ?",
    args: [year],
  });

  const leaderboard = await db.execute({
    sql: `
      SELECT
        p.id, p.name, p.color,
        COUNT(g.id) AS games_played,
        SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END) AS wins
      FROM players p
      LEFT JOIN game_players gp ON gp.player_id = p.id
      LEFT JOIN games g ON g.id = gp.game_id AND g.game = 'catan' AND g.counts_for_stats = 1 AND strftime('%Y', g.created_at) = ?
      GROUP BY p.id
      HAVING games_played > 0
    `,
    args: [year],
  });

  // partidas de ese año ordenadas por fecha para calcular rachas por jugador
  const recentGames = await db.execute({
    sql: `
      SELECT g.id, g.winner_id, g.created_at, gp.player_id
      FROM games g
      JOIN game_players gp ON gp.game_id = g.id
      WHERE g.game = 'catan' AND g.counts_for_stats = 1 AND strftime('%Y', g.created_at) = ?
      ORDER BY g.created_at ASC, g.rowid ASC
    `,
    args: [year],
  });

  const streaks = new Map<string, number>();
  const currentStreak = new Map<string, number>();
  const monthlyCounts = new Map<string, number>();
  const gameIdsSeen = new Set<string>();
  let gamesThisYear = 0;

  for (const row of recentGames.rows) {
    const playerId = String(row.player_id);
    const won = row.winner_id === row.player_id;
    if (won) {
      currentStreak.set(playerId, (currentStreak.get(playerId) ?? 0) + 1);
      streaks.set(playerId, Math.max(streaks.get(playerId) ?? 0, currentStreak.get(playerId)!));
    } else {
      currentStreak.set(playerId, 0);
    }

    const gameId = String(row.id);
    if (!gameIdsSeen.has(gameId)) {
      gameIdsSeen.add(gameId);
      const month = String(row.created_at).slice(0, 7);
      monthlyCounts.set(month, (monthlyCounts.get(month) ?? 0) + 1);
      gamesThisYear += 1;
    }
  }

  const monthly = Array.from(monthlyCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  const leaderboardRows: LeaderboardRow[] = leaderboard.rows.map((p) => {
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
  });

  return {
    mode: "live" as const,
    year: Number(year),
    totalGames: Number(totalGames.rows[0].count),
    gamesThisYear,
    monthly,
    leaderboard: sortLeaderboard(leaderboardRows),
  };
}

async function getLegacyYearStats(year: string) {
  const rows = await db.execute({
    sql: `
      SELECT p.id, p.name, p.color, ls.games_played, ls.wins
      FROM legacy_stats ls
      JOIN players p ON p.id = ls.player_id
      WHERE ls.game = 'catan' AND ls.year = ?
    `,
    args: [year],
  });

  const leaderboardRows: LeaderboardRow[] = rows.rows.map((r) => {
    const gamesPlayed = Number(r.games_played);
    const wins = Number(r.wins);
    return {
      id: String(r.id),
      name: String(r.name),
      color: String(r.color),
      games_played: gamesPlayed,
      wins,
      win_rate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
      current_streak: 0,
      best_streak: 0,
    };
  });

  return {
    mode: "legacy" as const,
    year: Number(year),
    totalGames: null,
    gamesThisYear: null,
    monthly: [],
    leaderboard: sortLeaderboard(leaderboardRows),
  };
}

async function getHistoricoCompleto() {
  const realLeaderboard = await db.execute(`
    SELECT
      p.id,
      COUNT(g.id) AS games_played,
      SUM(CASE WHEN g.winner_id = p.id THEN 1 ELSE 0 END) AS wins
    FROM players p
    LEFT JOIN game_players gp ON gp.player_id = p.id
    LEFT JOIN games g ON g.id = gp.game_id AND g.game = 'catan' AND g.counts_for_stats = 1
    GROUP BY p.id
  `);

  const legacyRows = await db.execute(
    "SELECT player_id, games_played, wins FROM legacy_stats WHERE game = 'catan'"
  );

  const playersMeta = await db.execute("SELECT id, name, color FROM players");
  const metaById = new Map(
    playersMeta.rows.map((p) => [String(p.id), { name: String(p.name), color: String(p.color) }])
  );

  const totals = new Map<string, { games_played: number; wins: number }>();

  for (const row of realLeaderboard.rows) {
    totals.set(String(row.id), { games_played: Number(row.games_played), wins: Number(row.wins) });
  }
  for (const row of legacyRows.rows) {
    const id = String(row.player_id);
    const prev = totals.get(id) ?? { games_played: 0, wins: 0 };
    totals.set(id, {
      games_played: prev.games_played + Number(row.games_played),
      wins: prev.wins + Number(row.wins),
    });
  }

  const leaderboardRows: LeaderboardRow[] = Array.from(totals.entries())
    .filter(([, t]) => t.games_played > 0)
    .map(([id, t]) => {
      const meta = metaById.get(id);
      return {
        id,
        name: meta?.name ?? "?",
        color: meta?.color ?? "#7f8c8d",
        games_played: t.games_played,
        wins: t.wins,
        win_rate: t.games_played > 0 ? t.wins / t.games_played : 0,
        current_streak: 0,
        best_streak: 0,
      };
    });

  return {
    mode: "historico" as const,
    year: null,
    totalGames: null,
    gamesThisYear: null,
    monthly: [],
    leaderboard: sortLeaderboard(leaderboardRows),
  };
}


/**
 * Con muy pocas partidas el porcentaje engaña (1 de 1 = 100%), así que
 * quien no llega al mínimo se aparta a una lista provisional en vez de
 * competir en el ranking con los veteranos.
 */
const MIN_RANKED_GAMES = 6;

function splitByExperience<T extends { leaderboard: LeaderboardRow[] }>(data: T) {
  const ranked = data.leaderboard.filter((p) => p.games_played >= MIN_RANKED_GAMES);
  const provisional = data.leaderboard.filter((p) => p.games_played < MIN_RANKED_GAMES);
  return { ...data, leaderboard: ranked, provisional, minRankedGames: MIN_RANKED_GAMES };
}

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");

  if (yearParam === "all") {
    return NextResponse.json(splitByExperience(await getHistoricoCompleto()));
  }

  const year = yearParam ?? String(new Date().getFullYear());

  const realCount = await db.execute({
    sql: "SELECT COUNT(*) as count FROM games WHERE game = 'catan' AND counts_for_stats = 1 AND strftime('%Y', created_at) = ?",
    args: [year],
  });

  if (Number(realCount.rows[0].count) > 0) {
    return NextResponse.json(splitByExperience(await getRealYearStats(year)));
  }

  return NextResponse.json(splitByExperience(await getLegacyYearStats(year)));
}
