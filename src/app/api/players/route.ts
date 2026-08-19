import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { colorForIndex } from "@/lib/colors";
import { normalizeGame } from "@/lib/games";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const game = normalizeGame(searchParams.get("game"));

  // En mus se gana por equipo (tu equipo es el ganador); en catán,
  // ganas si eres el winner_id de la partida.
  const winCondition =
    game === "mus" ? "gp.team = g.winner_team" : "g.winner_id = p.id";

  const result = await db.execute({
    sql: `
      SELECT
        p.id,
        p.name,
        p.color,
        COUNT(g.id) AS games_played,
        SUM(CASE WHEN ${winCondition} THEN 1 ELSE 0 END) AS wins,
        MAX(g.created_at) AS last_played
      FROM players p
      LEFT JOIN game_players gp ON gp.player_id = p.id
      LEFT JOIN games g ON g.id = gp.game_id AND g.game = ? AND g.counts_for_stats = 1
      WHERE p.game = ?
      GROUP BY p.id
    `,
    args: [game, game],
  });

  // El histórico de temporadas anteriores a la app se suma a las cifras
  // del jugador, para que reflejen su trayectoria completa.
  const legacy = await db.execute({
    sql: `SELECT player_id, SUM(games_played) AS games_played, SUM(wins) AS wins
          FROM legacy_stats WHERE game = ? GROUP BY player_id`,
    args: [game],
  });
  const legacyById = new Map(
    legacy.rows.map((r) => [
      String(r.player_id),
      { games_played: Number(r.games_played), wins: Number(r.wins) },
    ])
  );

  const players = result.rows
    .map((p) => {
      const extra = legacyById.get(String(p.id));
      return {
        id: String(p.id),
        name: String(p.name),
        color: String(p.color),
        games_played: Number(p.games_played) + (extra?.games_played ?? 0),
        wins: Number(p.wins) + (extra?.wins ?? 0),
        last_played: p.last_played ? String(p.last_played) : null,
      };
    })
    // primero quien ha jugado más recientemente; los que solo tienen
    // histórico (sin partidas en la app) van después, por veteranía.
    .sort((a, b) => {
      if (a.last_played && b.last_played) {
        if (a.last_played !== b.last_played) return a.last_played < b.last_played ? 1 : -1;
      } else if (a.last_played !== b.last_played) {
        return a.last_played ? -1 : 1;
      }
      if (b.games_played !== a.games_played) return b.games_played - a.games_played;
      return a.name.localeCompare(b.name, "es");
    });

  return NextResponse.json(players);
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json();
  const game = normalizeGame(body?.game);
  const trimmed = (body?.name ?? "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, name, color FROM players WHERE name = ? COLLATE NOCASE AND game = ?",
    args: [trimmed, game],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json(existing.rows[0]);
  }

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM players WHERE game = ?",
    args: [game],
  });
  const count = Number(countResult.rows[0].count);
  const id = crypto.randomUUID();
  const color = colorForIndex(count);

  try {
    await db.execute({
      sql: "INSERT INTO players (id, name, color, game) VALUES (?, ?, ?, ?)",
      args: [id, trimmed, color, game],
    });
  } catch {
    // Posible condición de carrera: alguien creó el mismo nombre justo antes.
    const retry = await db.execute({
      sql: "SELECT id, name, color FROM players WHERE name = ? COLLATE NOCASE AND game = ?",
      args: [trimmed, game],
    });
    if (retry.rows.length > 0) {
      return NextResponse.json(retry.rows[0]);
    }
    return NextResponse.json({ error: "No se pudo crear el jugador" }, { status: 500 });
  }

  return NextResponse.json({ id, name: trimmed, color }, { status: 201 });
}
