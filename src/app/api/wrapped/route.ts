import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { normalizeGame } from "@/lib/games";
import type { GameId } from "@/lib/games";
import {
  aggregatePartners,
  aggregatePlayers,
  gamesByMonth,
  loadCountedGames,
  loadPlayers,
} from "@/lib/stats";
import type { StatPlayerRef, WrappedData, WrappedEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const MIN_PAIR_GAMES = 2;
const SOLID_PAIR_GAMES = 4;

async function availableYears(game: GameId): Promise<number[]> {
  const [legacyRes, liveRes] = await Promise.all([
    db.execute({
      sql: "SELECT DISTINCT year FROM legacy_stats WHERE game = ? ORDER BY year ASC",
      args: [game],
    }),
    db.execute({
      sql: "SELECT DISTINCT strftime('%Y', created_at) AS year FROM games WHERE game = ? ORDER BY year ASC",
      args: [game],
    }),
  ]);

  const years = new Set<number>();
  for (const row of legacyRes.rows) years.add(Number(row.year));
  for (const row of liveRes.rows) years.add(Number(row.year));
  years.add(new Date().getFullYear());
  return Array.from(years)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);
}

function sortEntries(entries: WrappedEntry[]) {
  return entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate;
    return b.games_played - a.games_played;
  });
}

export async function GET(request: Request) {
  await ensureSchema();

  const { searchParams } = new URL(request.url);
  const game = normalizeGame(searchParams.get("game"));

  const years = await availableYears(game);
  const yearParam = searchParams.get("year");
  const year =
    yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : new Date().getFullYear();
  const yearStr = String(year);

  // partidas amistosas del año (quedan en la crónica pero no cuentan)
  const friendlyRes = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM games WHERE game = ? AND counts_for_stats = 0 AND strftime('%Y', created_at) = ?",
    args: [game, yearStr],
  });
  const friendlyGames = Number(friendlyRes.rows[0]?.c ?? 0);

  const base: WrappedData = {
    game,
    year,
    years,
    mode: "empty",
    totalGames: null,
    friendlyGames,
    totalPlayers: 0,
    champion: null,
    podium: [],
    longestStreak: null,
    bestPair: null,
    busiestMonth: null,
    firstGame: null,
    lastGame: null,
    photo: null,
  };

  const [players, games] = await Promise.all([
    loadPlayers(game),
    loadCountedGames(game, yearStr),
  ]);
  const ref = (id: string): StatPlayerRef =>
    players.get(id) ?? { id, name: "?", color: "#7f8c8d" };

  /* --- Año con partidas registradas en la app --- */
  if (games.length > 0) {
    const perPlayer = aggregatePlayers(game, games);

    const entries: WrappedEntry[] = [];
    let streak: WrappedData["longestStreak"] = null;
    for (const [id, agg] of perPlayer) {
      if (!players.has(id)) continue;
      entries.push({
        player: ref(id),
        wins: agg.wins,
        games_played: agg.gamesPlayed,
        win_rate: agg.gamesPlayed > 0 ? agg.wins / agg.gamesPlayed : 0,
      });
      if (agg.bestStreak >= 2 && (!streak || agg.bestStreak > streak.length)) {
        streak = { player: ref(id), length: agg.bestStreak };
      }
    }
    sortEntries(entries);

    let bestPair: WrappedData["bestPair"] = null;
    const partners = aggregatePartners(game, games).filter(
      (p) => p.together >= MIN_PAIR_GAMES && p.wins > 0
    );
    if (partners.length > 0) {
      const best = partners.slice().sort((x, y) => {
        if (y.wins !== x.wins) return y.wins - x.wins;
        const rx = x.wins / x.together;
        const ry = y.wins / y.together;
        if (ry !== rx) return ry - rx;
        return y.together - x.together;
      })[0];
      bestPair = {
        a: ref(best.aId),
        b: ref(best.bId),
        together: best.together,
        wins: best.wins,
        win_rate: best.wins / best.together,
        provisional: best.together < SOLID_PAIR_GAMES,
      };
    }

    const months = gamesByMonth(games);
    const busiest = months.slice().sort((a, b) => b.games - a.games)[0] ?? null;

    // una sola foto: `image` es base64 y pesa mucho, nunca se piden varias
    const photoRes = await db.execute({
      sql: `
        SELECT g.id, g.created_at, g.image, g.winner_id, g.winner_team
        FROM games g
        WHERE g.game = ? AND strftime('%Y', g.created_at) = ? AND g.image IS NOT NULL
        ORDER BY g.created_at DESC, g.rowid DESC
        LIMIT 1
      `,
      args: [game, yearStr],
    });

    let photo: WrappedData["photo"] = null;
    const photoRow = photoRes.rows[0];
    if (photoRow && photoRow.image) {
      let winner: string | null = null;
      if (game === "mus") {
        const teamRes = await db.execute({
          sql: `
            SELECT p.name FROM game_players gp
            JOIN players p ON p.id = gp.player_id
            WHERE gp.game_id = ? AND gp.team = ?
          `,
          args: [String(photoRow.id), Number(photoRow.winner_team ?? 0)],
        });
        const names = teamRes.rows.map((r) => String(r.name));
        winner = names.length > 0 ? names.join(" y ") : null;
      } else {
        winner = players.get(String(photoRow.winner_id))?.name ?? null;
      }
      photo = {
        id: String(photoRow.id),
        image: String(photoRow.image),
        created_at: String(photoRow.created_at),
        winner,
      };
    }

    const payload: WrappedData = {
      ...base,
      mode: "live",
      totalGames: games.length,
      totalPlayers: entries.length,
      champion: entries.length > 0 && entries[0].wins > 0 ? entries[0] : null,
      podium: entries.slice(0, 3),
      longestStreak: streak,
      bestPair,
      busiestMonth: busiest && busiest.games >= 2 ? busiest : null,
      firstGame: games[0].createdAt,
      lastGame: games[games.length - 1].createdAt,
      photo,
    };
    return NextResponse.json(payload);
  }

  /* --- Temporada importada (legacy): solo totales por jugador --- */
  const legacyRes = await db.execute({
    sql: `
      SELECT p.id, p.name, p.color, ls.games_played, ls.wins
      FROM legacy_stats ls
      JOIN players p ON p.id = ls.player_id
      WHERE ls.game = ? AND ls.year = ? AND p.game = ?
    `,
    args: [game, year, game],
  });

  if (legacyRes.rows.length === 0) {
    return NextResponse.json(base);
  }

  const entries: WrappedEntry[] = legacyRes.rows.map((r) => {
    const played = Number(r.games_played);
    const wins = Number(r.wins);
    return {
      player: { id: String(r.id), name: String(r.name), color: String(r.color) },
      wins,
      games_played: played,
      win_rate: played > 0 ? wins / played : 0,
    };
  });
  sortEntries(entries);

  // En catán cada partida tiene exactamente un ganador, así que la suma de
  // victorias del año ES el número de partidas. En juegos por parejas no
  // vale esa cuenta, así que no se inventa un total.
  const totalGames =
    game === "catan" ? entries.reduce((acc, e) => acc + e.wins, 0) : null;

  const payload: WrappedData = {
    ...base,
    mode: "legacy",
    totalGames,
    totalPlayers: entries.length,
    champion: entries.length > 0 && entries[0].wins > 0 ? entries[0] : null,
    podium: entries.slice(0, 3),
  };
  return NextResponse.json(payload);
}
