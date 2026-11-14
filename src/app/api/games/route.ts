import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";
import { gameDateToTimestamp } from "@/lib/game-date";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSchema();
  const params = new URL(request.url).searchParams;
  const requestedLimit = Number(params.get("limit"));
  const requestedOffset = Number(params.get("offset"));
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(50, requestedLimit) : 50;
  const offset = Number.isInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  const games = await db.execute({ sql: `
    SELECT g.id, g.game, g.winner_id, g.image, g.counts_for_stats, g.created_at, p.name as winner_name, p.color as winner_color
    FROM games g
    JOIN players p ON p.id = g.winner_id
    WHERE g.game = 'catan'
    ORDER BY g.created_at DESC, g.rowid DESC
    LIMIT ? OFFSET ?
  `, args: [limit, offset] });

  const ids = games.rows.map((g) => String(g.id));
  if (ids.length === 0) return NextResponse.json([]);
  const playersByGame = await db.execute({ sql: `
    SELECT gp.game_id, gp.is_winner, pl.id, pl.name, pl.color
    FROM game_players gp
    JOIN players pl ON pl.id = gp.player_id
    WHERE gp.game_id IN (${ids.map(() => "?").join(",")})
  `, args: ids });

  const grouped = new Map();
  for (const row of playersByGame.rows) {
    const key = row.game_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ id: row.id, name: row.name, color: row.color, is_winner: Number(row.is_winner) === 1 });
  }

  const enriched = games.rows.map((g) => ({
    ...g,
    counts_for_stats: Number(g.counts_for_stats) === 1,
    players: grouped.get(g.id) ?? [],
    winners: (grouped.get(g.id) ?? []).filter((p: { is_winner: boolean }) => p.is_winner),
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  await ensureSchema();
  const { playerIds: rawPlayerIds, winnerIds: rawWinnerIds, winnerId, date, image, countsForStats } = await request.json();

  if (!Array.isArray(rawPlayerIds) || rawPlayerIds.length < 2 || rawPlayerIds.some((id) => typeof id !== "string" || !id)) {
    return NextResponse.json({ error: "Se necesitan al menos 2 jugadores" }, { status: 400 });
  }
  const playerIds = Array.from(new Set(rawPlayerIds));
  if (playerIds.length < 2) {
    return NextResponse.json({ error: "Se necesitan al menos 2 jugadores distintos" }, { status: 400 });
  }
  if (playerIds.length > 20) {
    return NextResponse.json({ error: "Máximo 20 jugadores por partida" }, { status: 400 });
  }
  const known = await db.execute({
    sql: `SELECT id FROM players WHERE game = 'catan' AND id IN (${playerIds.map(() => "?").join(",")})`,
    args: playerIds as string[],
  });
  if (known.rows.length !== playerIds.length) return NextResponse.json({ error: "Algún jugador no existe o no es de Catán" }, { status: 400 });
  const winnerIds = rawWinnerIds ?? (winnerId ? [winnerId] : []);
  if (!Array.isArray(winnerIds) || winnerIds.length < 1 || winnerIds.length > 2 ||
      winnerIds.some((id) => typeof id !== "string" || !playerIds.includes(id)) || new Set(winnerIds).size !== winnerIds.length) {
    return NextResponse.json({ error: "Elige uno o dos ganadores entre los jugadores" }, { status: 400 });
  }
  const createdAt = gameDateToTimestamp(date);
  if (!createdAt) return NextResponse.json({ error: "Fecha inválida o futura" }, { status: 400 });
  if (typeof image === "string" && image.length > 2_000_000) {
    return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const counts = countsForStats === false ? 0 : 1;
  try {
    await db.batch(
      [
        {
          sql: "INSERT INTO games (id, game, winner_id, image, counts_for_stats, created_at) VALUES (?, 'catan', ?, ?, ?, ?)",
          args: [id, winnerIds[0], typeof image === "string" ? image : null, counts, createdAt],
        },
        ...playerIds.map((playerId) => ({
          sql: "INSERT INTO game_players (game_id, player_id, is_winner) VALUES (?, ?, ?)",
          args: [id, playerId as string, winnerIds.includes(playerId) ? 1 : 0],
        })),
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la partida" }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
