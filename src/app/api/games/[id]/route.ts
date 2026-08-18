import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] });
  const result = await db.execute({ sql: "DELETE FROM games WHERE id = ?", args: [id] });
  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
