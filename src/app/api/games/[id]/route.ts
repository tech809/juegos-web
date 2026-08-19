import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

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
    image?: unknown;
    countsForStats?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const existing = await db.execute({
    sql: "SELECT id, game, winner_id, image, counts_for_stats FROM games WHERE id = ?",
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

  const winnerId =
    body.winnerId === undefined ? String(current.winner_id) : body.winnerId;
  if (typeof winnerId !== "string" || !effectivePlayerIds.includes(winnerId)) {
    return NextResponse.json(
      { error: "El ganador debe estar entre los jugadores" },
      { status: 400 }
    );
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
          sql: "UPDATE games SET winner_id = ?, image = ?, counts_for_stats = ? WHERE id = ?",
          args: [winnerId, image, counts, id],
        },
        ...(playerIds
          ? [
              { sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] },
              ...playerIds.map((playerId) => ({
                sql: "INSERT INTO game_players (game_id, player_id) VALUES (?, ?)",
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
