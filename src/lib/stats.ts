import { db } from "@/lib/db";
import type { GameId } from "@/lib/games";
import type { StatPlayerRef } from "@/lib/types";

/**
 * Utilidades compartidas para estadísticas avanzadas y resumen anual.
 *
 * Reglas que se respetan SIEMPRE aquí:
 *  - solo partidas del juego pedido (`games.game = ?`),
 *  - solo partidas con `counts_for_stats = 1`,
 *  - solo jugadores de ese juego (`players.game = ?`): catán y mus tienen
 *    listas de jugadores distintas aunque compartan nombres,
 *  - nunca se selecciona `games.image` (son fotos en base64, pesan muchísimo).
 */

export type CountedParticipant = { playerId: string; team: number | null };

export type CountedGame = {
  id: string;
  winnerId: string;
  winnerTeam: number | null;
  createdAt: string; // 'YYYY-MM-DD HH:MM:SS' (UTC)
  participants: CountedParticipant[];
};

export type PlayerAgg = {
  gamesPlayed: number;
  wins: number;
  bestStreak: number;
  currentStreak: number;
};

export type RivalAgg = {
  aId: string;
  bId: string;
  together: number; // partidas en las que coincidieron como rivales
  aWins: number;
  bWins: number;
};

export type PartnerAgg = {
  aId: string;
  bId: string;
  together: number;
  wins: number;
};

export async function loadPlayers(game: GameId): Promise<Map<string, StatPlayerRef>> {
  const res = await db.execute({
    sql: "SELECT id, name, color FROM players WHERE game = ?",
    args: [game],
  });
  return new Map(
    res.rows.map((r) => [
      String(r.id),
      { id: String(r.id), name: String(r.name), color: String(r.color) },
    ])
  );
}

/** Partidas que cuentan para estadísticas, en orden cronológico. `year` opcional ('YYYY'). */
export async function loadCountedGames(game: GameId, year?: string): Promise<CountedGame[]> {
  const res = year
    ? await db.execute({
        sql: `
          SELECT g.id, g.winner_id, g.winner_team, g.created_at, gp.player_id, gp.team
          FROM games g
          JOIN game_players gp ON gp.game_id = g.id
          WHERE g.game = ? AND g.counts_for_stats = 1 AND strftime('%Y', g.created_at) = ?
          ORDER BY g.created_at ASC, g.rowid ASC
        `,
        args: [game, year],
      })
    : await db.execute({
        sql: `
          SELECT g.id, g.winner_id, g.winner_team, g.created_at, gp.player_id, gp.team
          FROM games g
          JOIN game_players gp ON gp.game_id = g.id
          WHERE g.game = ? AND g.counts_for_stats = 1
          ORDER BY g.created_at ASC, g.rowid ASC
        `,
        args: [game],
      });

  const byId = new Map<string, CountedGame>();
  const ordered: CountedGame[] = [];

  for (const row of res.rows) {
    const id = String(row.id);
    let entry = byId.get(id);
    if (!entry) {
      entry = {
        id,
        winnerId: String(row.winner_id),
        winnerTeam:
          row.winner_team === null || row.winner_team === undefined
            ? null
            : Number(row.winner_team),
        createdAt: String(row.created_at),
        participants: [],
      };
      byId.set(id, entry);
      ordered.push(entry);
    }
    entry.participants.push({
      playerId: String(row.player_id),
      team: row.team === null || row.team === undefined ? null : Number(row.team),
    });
  }

  return ordered;
}

/** En mus gana el EQUIPO (team === winner_team); en catán gana el jugador (winner_id). */
export function didWin(game: GameId, g: CountedGame, p: CountedParticipant): boolean {
  if (game === "mus") {
    return p.team !== null && g.winnerTeam !== null && p.team === g.winnerTeam;
  }
  return g.winnerId === p.playerId;
}

/** Partidas, victorias, mejor racha y racha viva de cada jugador. */
export function aggregatePlayers(game: GameId, games: CountedGame[]): Map<string, PlayerAgg> {
  const agg = new Map<string, PlayerAgg>();
  const running = new Map<string, number>();

  for (const g of games) {
    for (const p of g.participants) {
      let entry = agg.get(p.playerId);
      if (!entry) {
        entry = { gamesPlayed: 0, wins: 0, bestStreak: 0, currentStreak: 0 };
        agg.set(p.playerId, entry);
      }
      entry.gamesPlayed += 1;
      if (didWin(game, g, p)) {
        entry.wins += 1;
        const streak = (running.get(p.playerId) ?? 0) + 1;
        running.set(p.playerId, streak);
        entry.bestStreak = Math.max(entry.bestStreak, streak);
      } else {
        running.set(p.playerId, 0);
      }
    }
  }

  for (const [id, entry] of agg) entry.currentStreak = running.get(id) ?? 0;
  return agg;
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * Duelos entre rivales. En mus solo cuentan las parejas de EQUIPOS
 * CONTRARIOS (tu compañero no es tu rival). En catán, cualquier par
 * de jugadores que compartieron mesa.
 */
export function aggregateRivals(game: GameId, games: CountedGame[]): RivalAgg[] {
  const map = new Map<string, RivalAgg>();

  for (const g of games) {
    const ps = g.participants;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const p = ps[i];
        const q = ps[j];
        if (game === "mus") {
          if (p.team === null || q.team === null) continue;
          if (p.team === q.team) continue;
        }
        const key = pairKey(p.playerId, q.playerId);
        const [a, b] = p.playerId < q.playerId ? [p, q] : [q, p];
        let rec = map.get(key);
        if (!rec) {
          rec = { aId: a.playerId, bId: b.playerId, together: 0, aWins: 0, bWins: 0 };
          map.set(key, rec);
        }
        rec.together += 1;
        if (didWin(game, g, a)) rec.aWins += 1;
        else if (didWin(game, g, b)) rec.bWins += 1;
      }
    }
  }

  return Array.from(map.values());
}

/** Parejas del mismo equipo (solo tiene sentido en mus). */
export function aggregatePartners(game: GameId, games: CountedGame[]): PartnerAgg[] {
  if (game !== "mus") return [];
  const map = new Map<string, PartnerAgg>();

  for (const g of games) {
    const ps = g.participants;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const p = ps[i];
        const q = ps[j];
        if (p.team === null || q.team === null) continue;
        if (p.team !== q.team) continue;
        const key = pairKey(p.playerId, q.playerId);
        const [a, b] = p.playerId < q.playerId ? [p, q] : [q, p];
        let rec = map.get(key);
        if (!rec) {
          rec = { aId: a.playerId, bId: b.playerId, together: 0, wins: 0 };
          map.set(key, rec);
        }
        rec.together += 1;
        if (didWin(game, g, a)) rec.wins += 1;
      }
    }
  }

  return Array.from(map.values());
}

/** Partidas por mes ('YYYY-MM'), en orden cronológico. */
export function gamesByMonth(games: CountedGame[]): { month: string; games: number }[] {
  const counts = new Map<string, number>();
  for (const g of games) {
    const month = g.createdAt.slice(0, 7);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, games: count }));
}
