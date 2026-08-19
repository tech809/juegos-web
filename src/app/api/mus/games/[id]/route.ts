import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Editar una partida de mus ya registrada: las parejas, qué pareja ganó,
 * la foto y si cuenta para las estadísticas.
 *
 * Los campos que no vengan en el body se dejan como estaban. En `image`,
 * `null` significa "quitar la foto" y `undefined` "no la toques".
 *
 * Para borrar una partida se sigue usando DELETE /api/games/[id], que vale
 * para los dos juegos.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;

  let body: {
    teamA?: unknown;
    teamB?: unknown;
    winnerTeam?: unknown;
    image?: unknown;
    countsForStats?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, game, winner_team, image, counts_for_stats FROM games WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  const current = existing.rows[0];
  if (String(current.game) !== "mus") {
    return NextResponse.json(
      { error: "Esta partida no es de mus; edítala desde su propia crónica" },
      { status: 400 }
    );
  }

  // parejas: o vienen las dos, o no se toca ninguna
  const wantsTeams = body.teamA !== undefined || body.teamB !== undefined;
  let teamA: string[] | null = null;
  let teamB: string[] | null = null;

  if (wantsTeams) {
    const a = body.teamA;
    const b = body.teamB;
    if (
      !Array.isArray(a) ||
      a.length !== 2 ||
      !Array.isArray(b) ||
      b.length !== 2 ||
      [...a, ...b].some((p) => typeof p !== "string" || !p)
    ) {
      return NextResponse.json(
        { error: "Cada pareja necesita exactamente 2 jugadores" },
        { status: 400 }
      );
    }
    teamA = a as string[];
    teamB = b as string[];
    if (new Set([...teamA, ...teamB]).size !== 4) {
      return NextResponse.json(
        { error: "No puede repetirse un jugador entre las dos parejas" },
        { status: 400 }
      );
    }
    const all = [...teamA, ...teamB];
    const placeholders = all.map(() => "?").join(",");
    const known = await db.execute({
      sql: `SELECT id FROM players WHERE game = 'mus' AND id IN (${placeholders})`,
      args: all,
    });
    if (known.rows.length !== 4) {
      return NextResponse.json(
        { error: "Algún jugador no existe o no es de mus" },
        { status: 400 }
      );
    }
  }

  const winnerTeam =
    body.winnerTeam === undefined ? Number(current.winner_team) : body.winnerTeam;
  if (winnerTeam !== 0 && winnerTeam !== 1) {
    return NextResponse.json({ error: "Debes indicar la pareja ganadora" }, { status: 400 });
  }

  let image: string | null;
  if (body.image === undefined) {
    image = current.image ? String(current.image) : null;
  } else if (body.image === null) {
    image = null;
  } else if (typeof body.image === "string") {
    if (body.image.length > 2_000_000) {
      return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 400 });
    }
    image = body.image;
  } else {
    return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
  }

  const counts =
    body.countsForStats === undefined
      ? Number(current.counts_for_stats)
      : body.countsForStats === false
        ? 0
        : 1;

  // winner_id se mantiene como jugador representativo de la pareja ganadora
  let winnerId: string;
  if (teamA && teamB) {
    winnerId = winnerTeam === 0 ? teamA[0] : teamB[0];
  } else {
    const rep = await db.execute({
      sql: "SELECT player_id FROM game_players WHERE game_id = ? AND team = ? LIMIT 1",
      args: [id, winnerTeam],
    });
    if (rep.rows.length === 0) {
      return NextResponse.json(
        { error: "Esa pareja no tiene jugadores en la partida" },
        { status: 400 }
      );
    }
    winnerId = String(rep.rows[0].player_id);
  }

  try {
    await db.batch(
      [
        {
          sql: "UPDATE games SET winner_id = ?, winner_team = ?, image = ?, counts_for_stats = ? WHERE id = ?",
          args: [winnerId, winnerTeam, image, counts, id],
        },
        ...(teamA && teamB
          ? [
              { sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] },
              ...teamA.map((playerId) => ({
                sql: "INSERT INTO game_players (game_id, player_id, team) VALUES (?, ?, 0)",
                args: [id, playerId],
              })),
              ...teamB.map((playerId) => ({
                sql: "INSERT INTO game_players (game_id, player_id, team) VALUES (?, ?, 1)",
                args: [id, playerId],
              })),
            ]
          : []),
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la partida" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
