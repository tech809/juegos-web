import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

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
