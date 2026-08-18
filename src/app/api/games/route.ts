import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();
  const games = await db.execute(`
    SELECT g.id, g.game, g.winner_id, g.image, g.counts_for_stats, g.created_at, p.name as winner_name, p.color as winner_color
    FROM games g
    JOIN players p ON p.id = g.winner_id
    WHERE g.game = 'catan'
    ORDER BY g.created_at DESC, g.rowid DESC
    LIMIT 50
  `);

  const playersByGame = await db.execute(`
    SELECT gp.game_id, pl.id, pl.name, pl.color
    FROM game_players gp
    JOIN players pl ON pl.id = gp.player_id
    JOIN games g2 ON g2.id = gp.game_id AND g2.game = 'catan'
  `);

  const grouped = new Map();
  for (const row of playersByGame.rows) {
    const key = row.game_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({ id: row.id, name: row.name, color: row.color });
  }

  const enriched = games.rows.map((g) => ({
    ...g,
    counts_for_stats: Number(g.counts_for_stats) === 1,
    players: grouped.get(g.id) ?? [],
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  await ensureSchema();
  const { playerIds: rawPlayerIds, winnerId, image, countsForStats } = await request.json();

  if (!Array.isArray(rawPlayerIds) || rawPlayerIds.length < 2) {
    return NextResponse.json({ error: "Se necesitan al menos 2 jugadores" }, { status: 400 });
  }
  const playerIds = Array.from(new Set(rawPlayerIds));
  if (playerIds.length < 2) {
    return NextResponse.json({ error: "Se necesitan al menos 2 jugadores distintos" }, { status: 400 });
  }
  if (!winnerId || !playerIds.includes(winnerId)) {
    return NextResponse.json({ error: "El ganador debe estar entre los jugadores" }, { status: 400 });
  }
  if (typeof image === "string" && image.length > 2_000_000) {
    return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const counts = countsForStats === false ? 0 : 1;
  try {
    await db.batch(
      [
        {
          sql: "INSERT INTO games (id, game, winner_id, image, counts_for_stats) VALUES (?, 'catan', ?, ?, ?)",
          args: [id, winnerId, typeof image === "string" ? image : null, counts],
        },
        ...playerIds.map((playerId) => ({
          sql: "INSERT INTO game_players (game_id, player_id) VALUES (?, ?)",
          args: [id, playerId as string],
        })),
      ],
      "write"
    );
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la partida" }, { status: 500 });
  }

  return NextResponse.json({ id }, { status: 201 });
}
