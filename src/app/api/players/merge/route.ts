import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { normalizeGame } from "@/lib/games";

export const dynamic = "force-dynamic";

/**
 * Fusiona `sourceId` dentro de `targetId`: todo lo que tenía el primero
 * (partidas, victorias, histórico) pasa al segundo y el primero desaparece.
 *
 * Solo entre jugadores del MISMO juego: en catán y en mus las listas de
 * jugadores son independientes, aunque compartan nombre.
 */
export async function POST(request: Request) {
  await ensureSchema();

  let body: { sourceId?: unknown; targetId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  const targetId = typeof body.targetId === "string" ? body.targetId : "";

  if (!sourceId || !targetId) {
    return NextResponse.json(
      { error: "Hay que indicar el jugador a fusionar y su destino" },
      { status: 400 }
    );
  }
  if (sourceId === targetId) {
    return NextResponse.json(
      { error: "No se puede fusionar un jugador consigo mismo" },
      { status: 400 }
    );
  }

  const res = await db.execute({
    sql: "SELECT id, name, game FROM players WHERE id IN (?, ?)",
    args: [sourceId, targetId],
  });
  const source = res.rows.find((r) => String(r.id) === sourceId);
  const target = res.rows.find((r) => String(r.id) === targetId);
  if (!source || !target) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }
  if (normalizeGame(source.game) !== normalizeGame(target.game)) {
    return NextResponse.json(
      { error: "Solo se pueden fusionar jugadores del mismo juego" },
      { status: 400 }
    );
  }

  try {
    await db.batch(
      [
        // 1. Partidas en las que YA estaban los dos: la fila del origen
        //    chocaría con la PK (game_id, player_id), así que se descarta.
        {
          sql: `DELETE FROM game_players
                WHERE player_id = ?
                  AND game_id IN (SELECT game_id FROM game_players WHERE player_id = ?)`,
          args: [sourceId, targetId],
        },
        // 2. El resto de partidas pasan al destino.
        {
          sql: "UPDATE game_players SET player_id = ? WHERE player_id = ?",
          args: [targetId, sourceId],
        },
        // 3. Las victorias del origen pasan a ser del destino.
        {
          sql: "UPDATE games SET winner_id = ? WHERE winner_id = ?",
          args: [targetId, sourceId],
        },
        // 4. Histórico: si los dos tienen fila del mismo año (UNIQUE
        //    game+year+player_id), se suman los totales en la del destino.
        {
          sql: `UPDATE legacy_stats
                SET games_played = games_played + COALESCE((
                      SELECT s.games_played FROM legacy_stats s
                      WHERE s.player_id = ? AND s.game = legacy_stats.game AND s.year = legacy_stats.year
                    ), 0),
                    wins = wins + COALESCE((
                      SELECT s.wins FROM legacy_stats s
                      WHERE s.player_id = ? AND s.game = legacy_stats.game AND s.year = legacy_stats.year
                    ), 0)
                WHERE player_id = ?`,
          args: [sourceId, sourceId, targetId],
        },
        // 5. …y se borra la fila del origen ya sumada.
        {
          sql: `DELETE FROM legacy_stats
                WHERE player_id = ?
                  AND EXISTS (
                    SELECT 1 FROM legacy_stats t
                    WHERE t.player_id = ? AND t.game = legacy_stats.game AND t.year = legacy_stats.year
                  )`,
          args: [sourceId, targetId],
        },
        // 6. Los años que solo tenía el origen se reasignan tal cual.
        {
          sql: "UPDATE legacy_stats SET player_id = ? WHERE player_id = ?",
          args: [targetId, sourceId],
        },
        // 7. Ya no queda ninguna referencia: el origen se puede borrar.
        {
          sql: "DELETE FROM players WHERE id = ?",
          args: [sourceId],
        },
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo fusionar el jugador" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    mergedInto: { id: targetId, name: String(target.name) },
    removed: { id: sourceId, name: String(source.name) },
  });
}
