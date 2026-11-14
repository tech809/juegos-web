import { NextResponse } from "next/server";
import { parseNotes } from "@/lib/notes";
import { db, ensureSchema } from "@/lib/db";
import { gameDateToTimestamp } from "@/lib/game-date";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;
  const [, gamesResult] = await db.batch(
    [
      { sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] },
      { sql: "DELETE FROM games WHERE id = ?", args: [id] },
      { sql: "DELETE FROM game_videos WHERE game_id = ?", args: [id] },
    ],
    "write"
  );
  if (gamesResult.rowsAffected === 0) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Editar una partida de catán ya registrada: quiénes jugaron, quién ganó,
 * la foto y si cuenta para las estadísticas.
 *
 * Los campos que no vengan en el body se dejan como estaban. En `image`,
 * `null` significa "quitar la foto" y `undefined` "no la toques".
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;

  let body: {
    playerIds?: unknown;
    winnerId?: unknown;
    winnerIds?: unknown;
    date?: unknown;
    image?: unknown;
    notes?: unknown;
    countsForStats?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, game, winner_id, image, notes, counts_for_stats, created_at FROM games WHERE id = ?",
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  const current = existing.rows[0];
  if (String(current.game) !== "catan") {
    return NextResponse.json(
      { error: "Esta partida no es de catán; edítala desde su propia crónica" },
      { status: 400 }
    );
  }

  // jugadores: si no vienen, se conservan los actuales
  let playerIds: string[] | null = null;
  if (body.playerIds !== undefined) {
    if (!Array.isArray(body.playerIds) || body.playerIds.some((p) => typeof p !== "string" || !p)) {
      return NextResponse.json({ error: "Jugadores inválidos" }, { status: 400 });
    }
    playerIds = Array.from(new Set(body.playerIds as string[]));
    if (playerIds.length < 2) {
      return NextResponse.json(
        { error: "Se necesitan al menos 2 jugadores distintos" },
        { status: 400 }
      );
    }
    if (playerIds.length > 20) return NextResponse.json({ error: "Máximo 20 jugadores" }, { status: 400 });
  }

  const currentPlayersRes = await db.execute({
    sql: "SELECT player_id FROM game_players WHERE game_id = ?",
    args: [id],
  });
  const effectivePlayerIds =
    playerIds ?? currentPlayersRes.rows.map((r) => String(r.player_id));

  if (effectivePlayerIds.length < 2) {
    return NextResponse.json(
      { error: "Se necesitan al menos 2 jugadores distintos" },
      { status: 400 }
    );
  }

  // todos los jugadores tienen que existir y ser de catán
  const placeholders = effectivePlayerIds.map(() => "?").join(",");
  const known = await db.execute({
    sql: `SELECT id FROM players WHERE game = 'catan' AND id IN (${placeholders})`,
    args: effectivePlayerIds,
  });
  if (known.rows.length !== effectivePlayerIds.length) {
    return NextResponse.json(
      { error: "Algún jugador no existe o no es de catán" },
      { status: 400 }
    );
  }

  const currentWinners = await db.execute({ sql: "SELECT player_id FROM game_players WHERE game_id = ? AND is_winner = 1", args: [id] });
  const winnerIds = body.winnerIds === undefined
    ? body.winnerId === undefined
      ? currentWinners.rows.map((r) => String(r.player_id))
      : [body.winnerId]
    : body.winnerIds;
  if (!Array.isArray(winnerIds) || winnerIds.length < 1 || winnerIds.length > 2 ||
      winnerIds.some((winnerId) => typeof winnerId !== "string" || !effectivePlayerIds.includes(winnerId)) ||
      new Set(winnerIds).size !== winnerIds.length) {
    return NextResponse.json(
      { error: "Elige uno o dos ganadores entre los jugadores" },
      { status: 400 }
    );
  }
  const createdAt = body.date === undefined ? String(current.created_at) : gameDateToTimestamp(body.date);
  if (!createdAt) return NextResponse.json({ error: "Fecha inválida o futura" }, { status: 400 });

  let notes: string | null;
  if (body.notes === undefined) {
    notes = current.notes ? String(current.notes) : null;
  } else {
    const parsed = parseNotes(body.notes);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    notes = parsed.notes;
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

  try {
    await db.batch(
      [
        {
          sql: "UPDATE games SET winner_id = ?, image = ?, notes = ?, counts_for_stats = ?, created_at = ? WHERE id = ?",
          args: [winnerIds[0], image, notes, counts, createdAt, id],
        },
        ...(playerIds
          ? [
              { sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] },
              ...playerIds.map((playerId) => ({
                sql: "INSERT INTO game_players (game_id, player_id, is_winner) VALUES (?, ?, ?)",
                args: [id, playerId, winnerIds.includes(playerId) ? 1 : 0],
              })),
            ]
          : [{ sql: "UPDATE game_players SET is_winner = CASE WHEN player_id IN (?, ?) THEN 1 ELSE 0 END WHERE game_id = ?", args: [winnerIds[0], winnerIds[1] ?? winnerIds[0], id] }]),
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la partida" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
