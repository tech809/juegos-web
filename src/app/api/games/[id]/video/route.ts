import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vercel rechaza cuerpos de más de 4,5 MB; el cliente ya comprime a ~2 MB.
const MAX_BYTES = 4_000_000;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const res = await db.execute({ sql: "SELECT mime, data FROM game_videos WHERE game_id = ?", args: [id] });
  if (res.rows.length === 0) return new NextResponse("No encontrado", { status: 404 });

  const bytes = new Uint8Array(res.rows[0].data as ArrayBuffer);
  const mime = String(res.rows[0].mime);
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  // Safari solo reproduce vídeo si el servidor atiende peticiones Range.
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = bytes.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new NextResponse(bytes.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new NextResponse(bytes, { headers: { ...headers, "Content-Length": String(bytes.length) } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (mime !== "video/webm" && mime !== "video/mp4") {
    return NextResponse.json({ error: "Formato de vídeo no admitido" }, { status: 400 });
  }
  const game = await db.execute({ sql: "SELECT id FROM games WHERE id = ?", args: [id] });
  if (game.rows.length === 0) return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.length === 0) return NextResponse.json({ error: "Vídeo vacío" }, { status: 400 });
  if (body.length > MAX_BYTES) return NextResponse.json({ error: "El vídeo es demasiado pesado" }, { status: 413 });

  await db.execute({
    sql: "INSERT OR REPLACE INTO game_videos (game_id, mime, data) VALUES (?, ?, ?)",
    args: [id, mime, body],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  await db.execute({ sql: "DELETE FROM game_videos WHERE game_id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
