import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { normalizeGame } from "@/lib/games";
import {
  aggregatePartners,
  aggregatePlayers,
  aggregateRivals,
  gamesByMonth,
  loadCountedGames,
  loadPlayers,
} from "@/lib/stats";
import type { AdvancedStats, StatPlayerRef } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Umbrales mínimos: con 1 o 2 partidas cualquier "titular" es ruido.
 * Preferimos no enseñar la tarjeta antes que inventar una leyenda.
 */
const MIN_PAIR_GAMES = 2; // por debajo se marca como provisional
const SOLID_PAIR_GAMES = 4;
const MIN_DUELS = 3; // duelos decididos para hablar de rivalidad
const SOLID_DUELS = 5;
const MIN_DUEL_DIFF = 2; // diferencia para considerarla "desequilibrada"
const MIN_MONTH_GAMES = 2;
const MIN_ACTIVE_GAMES = 2;
const MIN_WEEKDAY_GAMES = 5;

export async function GET(request: Request) {
  await ensureSchema();

  const { searchParams } = new URL(request.url);
  const game = normalizeGame(searchParams.get("game"));

  const [players, games] = await Promise.all([loadPlayers(game), loadCountedGames(game)]);
  const ref = (id: string): StatPlayerRef =>
    players.get(id) ?? { id, name: "?", color: "#7f8c8d" };
  const known = (id: string) => players.has(id);

  const empty: AdvancedStats = {
    game,
    totalGames: 0,
    totalPlayers: 0,
    bestPair: null,
    topRivalry: null,
    frequentRivalry: null,
    longestStreak: null,
    bestMonth: null,
    mostActive: null,
    favoriteWeekday: null,
    nemeses: [],
  };

  if (games.length === 0) return NextResponse.json(empty);

  const perPlayer = aggregatePlayers(game, games);

  /* --- Mejor pareja (solo mus) --- */
  let bestPair: AdvancedStats["bestPair"] = null;
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

  /* --- Rivalidades --- */
  const rivals = aggregateRivals(game, games);

  // Duelo "decidido" = partida en la que ganó uno de los dos. En catán puede
  // ganar un tercero, y esa partida no dice nada del duelo entre ambos.
  const decided = rivals
    .map((r) => ({ ...r, duels: r.aWins + r.bWins }))
    .filter((r) => r.duels >= MIN_DUELS);

  let topRivalry: AdvancedStats["topRivalry"] = null;
  const unbalanced = decided.filter((r) => Math.abs(r.aWins - r.bWins) >= MIN_DUEL_DIFF);
  if (unbalanced.length > 0) {
    const best = unbalanced.slice().sort((x, y) => {
      const rx = Math.max(x.aWins, x.bWins) / x.duels;
      const ry = Math.max(y.aWins, y.bWins) / y.duels;
      if (ry !== rx) return ry - rx;
      return y.duels - x.duels;
    })[0];
    const winnerIsA = best.aWins >= best.bWins;
    const winnerWins = winnerIsA ? best.aWins : best.bWins;
    const loserWins = winnerIsA ? best.bWins : best.aWins;
    topRivalry = {
      winner: ref(winnerIsA ? best.aId : best.bId),
      loser: ref(winnerIsA ? best.bId : best.aId),
      duels: best.duels,
      winner_wins: winnerWins,
      loser_wins: loserWins,
      win_rate: winnerWins / best.duels,
      provisional: best.duels < SOLID_DUELS,
    };
  }

  let frequentRivalry: AdvancedStats["frequentRivalry"] = null;
  const mostFaced = rivals
    .filter((r) => r.together >= MIN_DUELS)
    .sort((x, y) => y.together - x.together)[0];
  if (mostFaced) {
    frequentRivalry = {
      a: ref(mostFaced.aId),
      b: ref(mostFaced.bId),
      duels: mostFaced.together,
      a_wins: mostFaced.aWins,
      b_wins: mostFaced.bWins,
    };
  }

  // Bestia negra de cada jugador: el rival contra el que peor le va.
  const nemeses: AdvancedStats["nemeses"] = [];
  const byPlayer = new Map<string, { rivalId: string; wins: number; losses: number }[]>();
  for (const r of decided) {
    if (!byPlayer.has(r.aId)) byPlayer.set(r.aId, []);
    if (!byPlayer.has(r.bId)) byPlayer.set(r.bId, []);
    byPlayer.get(r.aId)!.push({ rivalId: r.bId, wins: r.aWins, losses: r.bWins });
    byPlayer.get(r.bId)!.push({ rivalId: r.aId, wins: r.bWins, losses: r.aWins });
  }
  for (const [playerId, list] of byPlayer) {
    if (!known(playerId)) continue;
    const worst = list
      .slice()
      .sort((x, y) => {
        const rx = x.wins / (x.wins + x.losses);
        const ry = y.wins / (y.wins + y.losses);
        if (rx !== ry) return rx - ry;
        return y.wins + y.losses - (x.wins + x.losses);
      })[0];
    const duels = worst.wins + worst.losses;
    if (worst.losses <= worst.wins) continue; // solo si de verdad le puede
    nemeses.push({
      player: ref(playerId),
      rival: ref(worst.rivalId),
      duels,
      wins: worst.wins,
      losses: worst.losses,
      win_rate: worst.wins / duels,
    });
  }
  nemeses.sort((a, b) => a.win_rate - b.win_rate || b.duels - a.duels);

  /* --- Racha histórica --- */
  let longestStreak: AdvancedStats["longestStreak"] = null;
  let streakHolder: { id: string; best: number; current: number } | null = null;
  for (const [id, agg] of perPlayer) {
    if (!known(id)) continue;
    if (!streakHolder || agg.bestStreak > streakHolder.best) {
      streakHolder = { id, best: agg.bestStreak, current: agg.currentStreak };
    }
  }
  if (streakHolder && streakHolder.best >= 2) {
    longestStreak = {
      player: ref(streakHolder.id),
      length: streakHolder.best,
      ongoing: streakHolder.current === streakHolder.best,
    };
  }

  /* --- Mejor mes --- */
  let bestMonth: AdvancedStats["bestMonth"] = null;
  const months = gamesByMonth(games);
  const topMonth = months.slice().sort((a, b) => b.games - a.games || b.month.localeCompare(a.month))[0];
  if (topMonth && topMonth.games >= MIN_MONTH_GAMES) {
    const monthGames = games.filter((g) => g.createdAt.slice(0, 7) === topMonth.month);
    const monthAgg = aggregatePlayers(game, monthGames);
    let top: { player: StatPlayerRef; wins: number; games_played: number } | null = null;
    let bestWins = 0;
    let bestPlayed = 0;
    let bestId: string | null = null;
    let tied = false;
    for (const [id, agg] of monthAgg) {
      if (!known(id) || agg.wins === 0) continue;
      if (agg.wins > bestWins) {
        bestWins = agg.wins;
        bestPlayed = agg.gamesPlayed;
        bestId = id;
        tied = false;
      } else if (agg.wins === bestWins && id !== bestId) {
        tied = true;
      }
    }
    // si varios empatan a victorias, no hay "el más en forma" que valga
    if (bestId && !tied) top = { player: ref(bestId), wins: bestWins, games_played: bestPlayed };
    bestMonth = { month: topMonth.month, games: topMonth.games, top };
  }

  /* --- Jugador más activo --- */
  let mostActive: AdvancedStats["mostActive"] = null;
  let activeId: string | null = null;
  let activeAgg = { gamesPlayed: 0, wins: 0 };
  for (const [id, agg] of perPlayer) {
    if (!known(id)) continue;
    if (agg.gamesPlayed > activeAgg.gamesPlayed) {
      activeId = id;
      activeAgg = { gamesPlayed: agg.gamesPlayed, wins: agg.wins };
    }
  }
  if (activeId && activeAgg.gamesPlayed >= MIN_ACTIVE_GAMES) {
    mostActive = {
      player: ref(activeId),
      games_played: activeAgg.gamesPlayed,
      wins: activeAgg.wins,
      win_rate: activeAgg.wins / activeAgg.gamesPlayed,
    };
  }

  /* --- Día favorito para jugar (created_at es UTC, igual que strftime) --- */
  let favoriteWeekday: AdvancedStats["favoriteWeekday"] = null;
  if (games.length >= MIN_WEEKDAY_GAMES) {
    const counts = new Array(7).fill(0) as number[];
    for (const g of games) {
      const d = new Date(`${g.createdAt.replace(" ", "T")}Z`);
      if (!Number.isNaN(d.getTime())) counts[d.getUTCDay()] += 1;
    }
    let bestDay = 0;
    for (let i = 1; i < 7; i++) if (counts[i] > counts[bestDay]) bestDay = i;
    if (counts[bestDay] > 0) {
      favoriteWeekday = {
        weekday: bestDay,
        games: counts[bestDay],
        share: counts[bestDay] / games.length,
      };
    }
  }

  const payload: AdvancedStats = {
    game,
    totalGames: games.length,
    totalPlayers: Array.from(perPlayer.keys()).filter(known).length,
    bestPair,
    topRivalry,
    frequentRivalry,
    longestStreak,
    bestMonth,
    mostActive,
    favoriteWeekday,
    nemeses: nemeses.slice(0, 3),
  };

  return NextResponse.json(payload);
}
