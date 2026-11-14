import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { gameDateToTimestamp } from "@/lib/game-date";
import { parseNotes } from "@/lib/notes";
import type { MusGameRecord, MusTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSchema();
  const params = new URL(request.url).searchParams;
  const requestedLimit = Number(params.get("limit"));
  const requestedOffset = Number(params.get("offset"));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(50, requestedLimit) : 50;
  const offset = Number.isInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  const games = await db.execute({ sql: `
    SELECT id, winner_team, image, notes, counts_for_stats, created_at,
           EXISTS(SELECT 1 FROM game_videos v WHERE v.game_id = games.id) AS has_video
    FROM games
    WHERE game = 'mus'
    ORDER BY created_at DESC, rowid DESC
    LIMIT ? OFFSET ?
  `, args: [limit, offset] });

  const gameIds = games.rows.map((g) => String(g.id));
  const grouped = new Map<string, { 0: MusTeam["players"]; 1: MusTeam["players"] }>();

  if (gameIds.length > 0) {
    const placeholders = gameIds.map(() => "?").join(",");
    const playersByGame = await db.execute({
      sql: `
        SELECT gp.game_id, gp.team, pl.id, pl.name, pl.color
        FROM game_players gp
        JOIN players pl ON pl.id = gp.player_id
        WHERE gp.game_id IN (${placeholders})
      `,
      args: gameIds,
    });

    for (const row of playersByGame.rows) {
      const key = String(row.game_id);
      if (!grouped.has(key)) grouped.set(key, { 0: [], 1: [] });
      const team = Number(row.team) === 1 ? 1 : 0;
      grouped.get(key)![team].push({
        id: String(row.id),
        name: String(row.name),
        color: String(row.color),
      });
    }
  }

  const enriched: MusGameRecord[] = games.rows.map((g) => {
    const teams = grouped.get(String(g.id)) ?? { 0: [], 1: [] };
    return {
      id: String(g.id),
      winner_team: Number(g.winner_team) === 1 ? 1 : 0,
      image: g.image ? String(g.image) : null,
      counts_for_stats: Number(g.counts_for_stats) === 1,
      has_video: Number(g.has_video) === 1,
      notes: g.notes ? String(g.notes) : null,
      created_at: String(g.created_at),
      teams: [{ players: teams[0] }, { players: teams[1] }],
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  await ensureSchema();
  const { teamA, teamB, winnerTeam, date, image, notes: rawNotes, countsForStats } = await request.json();
  const createdAt = gameDateToTimestamp(date);
  if (!createdAt) return NextResponse.json({ error: "Fecha inválida o futura" }, { status: 400 });

  if (!Array.isArray(teamA) || teamA.length !== 2 || !Array.isArray(teamB) || teamB.length !== 2) {
    return NextResponse.json(
      { error: "Cada pareja necesita exactamente 2 jugadores" },
      { status: 400 }
    );
  }
  if (teamA.some((id) => typeof id !== "string" || !id) || teamB.some((id) => typeof id !== "string" || !id)) {
    return NextResponse.json({ error: "Jugadores inválidos" }, { status: 400 });
  }
  const allIds = [...teamA, ...teamB];
  if (new Set(allIds).size !== 4) {
    return NextResponse.json(
      { error: "No puede repetirse un jugador entre las dos parejas" },
      { status: 400 }
    );
  }
  const known = await db.execute({
    sql: "SELECT id FROM players WHERE game = 'mus' AND id IN (?, ?, ?, ?)",
    args: allIds,
  });
  if (known.rows.length !== 4) return NextResponse.json({ error: "Algún jugador no existe o no es de Mus" }, { status: 400 });
  if (winnerTeam !== 0 && winnerTeam !== 1) {
    return NextResponse.json({ error: "Debes indicar la pareja ganadora" }, { status: 400 });
  }
  if (typeof image === "string" && image.length > 2_000_000) {
    return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 400 });
  }

  const parsedNotes = parseNotes(rawNotes);
  if (!parsedNotes.ok) return NextResponse.json({ error: parsedNotes.error }, { status: 400 });

  const id = crypto.randomUUID();
  const winnerId = winnerTeam === 0 ? teamA[0] : teamB[0];
  const counts = countsForStats === false ? 0 : 1;

  try {
    await db.batch(
      [
        {
          sql: "INSERT INTO games (id, game, winner_id, winner_team, image, notes, counts_for_stats, created_at) VALUES (?, 'mus', ?, ?, ?, ?, ?, ?)",
          args: [id, winnerId, winnerTeam, typeof image === "string" ? image : null, parsedNotes.notes, counts, createdAt],
        },
        ...teamA.map((playerId: string) => ({
          sql: "INSERT INTO game_players (game_id, player_id, team) VALUES (?, ?, 0)",
          args: [id, playerId],
        })),
        ...teamB.map((playerId: string) => ({
          sql: "INSERT INTO game_players (game_id, player_id, team) VALUES (?, ?, 1)",
          args: [id, playerId],
        })),
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la partida" }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
