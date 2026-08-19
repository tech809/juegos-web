import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { normalizeGame } from "@/lib/games";
import type { GamePhoto, GamePhotoPlayer, PhotosResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

/** Las imágenes son data URLs base64 y pesan mucho: nunca se piden en bloque. */
function parseLimit(raw: string | null) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

function parseOffset(raw: string | null) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export async function GET(request: Request) {
  await ensureSchema();

  const url = new URL(request.url);
  const game = normalizeGame(url.searchParams.get("game"));
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));

  // El total NO toca la columna `image` (sería traerse todas las fotos solo para contar).
  const totalRes = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM games WHERE game = ? AND image IS NOT NULL AND image <> ''",
    args: [game],
  });
  const total = Number(totalRes.rows[0]?.total ?? 0);

  const gamesRes = await db.execute({
    sql: `
      SELECT g.id, g.winner_id, g.winner_team, g.image, g.counts_for_stats, g.created_at,
             p.name AS winner_name, p.color AS winner_color
      FROM games g
      JOIN players p ON p.id = g.winner_id
      WHERE g.game = ? AND g.image IS NOT NULL AND g.image <> ''
      ORDER BY g.created_at DESC, g.rowid DESC
      LIMIT ? OFFSET ?
    `,
    args: [game, limit, offset],
  });

  const ids = gamesRes.rows.map((g) => String(g.id));
  const rosters = new Map<string, { player: GamePhotoPlayer; team: number | null }[]>();

  if (ids.length > 0) {
    const placeholders = ids.map(() => "?").join(",");
    const playersRes = await db.execute({
      sql: `
        SELECT gp.game_id, gp.team, pl.id, pl.name, pl.color
        FROM game_players gp
        JOIN players pl ON pl.id = gp.player_id
        WHERE gp.game_id IN (${placeholders})
      `,
      args: ids,
    });

    for (const row of playersRes.rows) {
      const key = String(row.game_id);
      if (!rosters.has(key)) rosters.set(key, []);
      rosters.get(key)!.push({
        player: { id: String(row.id), name: String(row.name), color: String(row.color) },
        team: row.team === null || row.team === undefined ? null : Number(row.team),
      });
    }
  }

  const photos: GamePhoto[] = gamesRes.rows.map((g) => {
    const id = String(g.id);
    const roster = rosters.get(id) ?? [];
    let winners: GamePhotoPlayer[];
    let rivals: GamePhotoPlayer[];

    if (game === "mus") {
      const winnerTeam = Number(g.winner_team) === 1 ? 1 : 0;
      winners = roster.filter((r) => r.team === winnerTeam).map((r) => r.player);
      rivals = roster.filter((r) => r.team !== winnerTeam).map((r) => r.player);
    } else {
      const winnerId = String(g.winner_id);
      winners = [
        {
          id: winnerId,
          name: String(g.winner_name),
          color: String(g.winner_color),
        },
      ];
      rivals = roster.filter((r) => r.player.id !== winnerId).map((r) => r.player);
    }

    return {
      id,
      game,
      image: String(g.image),
      created_at: String(g.created_at),
      counts_for_stats: Number(g.counts_for_stats) === 1,
      winners,
      rivals,
    };
  });

  const body: PhotosResponse = { total, limit, offset, photos };
  return NextResponse.json(body);
}
