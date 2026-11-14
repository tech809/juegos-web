"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; body: string; created_at: string };

export default function GameComments({ gameId }: { gameId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/games/${gameId}/comments`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setComments)
      .catch(() => setError("No se pudieron cargar los comentarios"));
  }, [gameId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/games/${gameId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setComments((prev) => [...prev, { id: result.id, body: body.trim(), created_at: new Date().toISOString() }]);
      setBody("");
    } catch { setError("No se pudo publicar el comentario"); }
    finally { setSaving(false); }
  }

  return <div className="w-full bg-card px-3 py-3 border-t border-border text-foreground">
    <p className="text-xs font-display font-semibold uppercase tracking-wide mb-2">Comentarios ({comments.length})</p>
    {comments.length > 0 && <ul className="space-y-1 mb-2">{comments.map((comment) =>
      <li key={comment.id} className="text-sm break-words whitespace-pre-wrap">{comment.body}</li>
    )}</ul>}
    <form onSubmit={submit} className="flex gap-2 items-end">
      <textarea aria-label="Comentario anónimo" placeholder="Escribe un comentario anónimo…" value={body}
        onChange={(event) => setBody(event.target.value)} maxLength={500} rows={1}
        className="min-w-0 flex-1 rounded border border-border bg-parchment-deep px-2 py-1.5 text-sm resize-y" />
      <button type="submit" disabled={saving || !body.trim()} className="rounded bg-wine px-3 py-1.5 text-sm text-[#f6e9c8] disabled:opacity-50">Enviar</button>
    </form>
    {error && <p role="alert" className="text-xs text-wine mt-1">{error}</p>}
  </div>;
}
