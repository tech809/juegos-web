import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const result = await db.execute({
    sql: "SELECT id, body, created_at FROM game_comments WHERE game_id = ? ORDER BY created_at ASC, rowid ASC",
    args: [id],
  });
  return NextResponse.json(result.rows);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  let body: unknown;
  try { body = (await request.json()).body; } catch { return NextResponse.json({ error: "Petición inválida" }, { status: 400 }); }
  if (typeof body !== "string" || !body.trim() || body.trim().length > 500) {
    return NextResponse.json({ error: "Escribe un comentario de hasta 500 caracteres" }, { status: 400 });
  }
  const game = await db.execute({ sql: "SELECT id FROM games WHERE id = ?", args: [id] });
  if (!game.rows.length) return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });
  const commentId = crypto.randomUUID();
  await db.execute({ sql: "INSERT INTO game_comments (id, game_id, body) VALUES (?, ?, ?)", args: [commentId, id, body.trim()] });
  return NextResponse.json({ id: commentId }, { status: 201 });
}
