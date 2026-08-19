"use client";

import { useEffect, useState } from "react";
import type { MusGameRecord } from "@/lib/types";
import { CrownIcon, PencilIcon, ScrollIcon, UndoIcon } from "./icons";
import Skeleton from "./Skeleton";
import EditMusGameModal from "./EditMusGameModal";
import ShareGameButton from "./ShareGameButton";

const PAGE_SIZE = 6;

function formatDate(iso: string) {
  const date = new Date(iso + "Z");
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentMusGames({ refreshKey }: { refreshKey?: number }) {
  const [games, setGames] = useState<MusGameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editingId, setEditingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/mus/games")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setGames)
      .catch(() => setError("No se pudo cargar la crónica. Comprueba tu conexión."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    load();
  }, [refreshKey]);

  async function undoGame(id: string) {
    setConfirmingId(null);
    setRemovingId(id);
    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (res.ok) {
        setGames((prev) => prev.filter((g) => g.id !== id));
      } else {
        setError("No se pudo deshacer la partida.");
      }
    } catch {
      setError("No se pudo deshacer la partida. Comprueba tu conexión.");
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-10 space-y-3">
        <Skeleton className="h-4 w-40 mx-auto" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <p className="text-sm opacity-60 mt-8 text-center italic flex items-center justify-center gap-2">
        <ScrollIcon className="w-4 h-4" />
        {error ?? "La crónica está en blanco. ¡Sed la primera pareja en escribir vuestra leyenda!"}
      </p>
    );
  }

  const visible = games.slice(0, visibleCount);
  const editingGame = games.find((g) => g.id === editingId) ?? null;

  return (
    <div className="mt-10">
      <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <ScrollIcon className="w-4 h-4 shrink-0" />
        Crónica reciente
      </h3>
      {error && <p className="text-xs text-wine font-semibold mb-2">{error}</p>}
      <ul className="space-y-4">
        {visible.map((g) => {
          const confirming = confirmingId === g.id;
          const winners = g.teams[g.winner_team]?.players ?? [];
          const rivals = g.teams[g.winner_team === 0 ? 1 : 0]?.players ?? [];

          const deleteControl = confirming ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] italic opacity-80 hidden sm:inline">¿Seguro?</span>
              <button
                type="button"
                onClick={() => undoGame(g.id)}
                disabled={removingId === g.id}
                className="text-[11px] font-display font-bold uppercase px-2 py-1 rounded bg-wine text-[#f6e9c8] hover:brightness-110 disabled:opacity-40"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="text-[11px] font-display uppercase px-2 py-1 rounded border border-white/40 text-white/90 hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingId(g.id)}
              title="Deshacer partida"
              aria-label="Deshacer partida"
              className="p-1.5 rounded text-wine/70 hover:text-wine hover:bg-wine/10 transition-colors"
            >
              <UndoIcon className="w-4 h-4" />
            </button>
          );

          const editControl = (
            <button
              type="button"
              onClick={() => setEditingId(g.id)}
              title="Editar partida"
              aria-label="Editar partida"
              className="p-1.5 rounded text-foreground/50 hover:text-wine hover:bg-wine/10 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          );

          if (g.image) {
            return (
              <li
                key={g.id}
                className={`relative rounded-sm overflow-hidden border-2 border-border transition-opacity ${
                  removingId === g.id ? "opacity-40" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image} alt="Foto de la partida" className="w-full h-56 sm:h-72 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                {!g.counts_for_stats && (
                  <span className="absolute top-2 left-2 text-[10px] font-display font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-black/60 text-gold-bright border border-gold-bright/40">
                    No cuenta
                  </span>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {!confirming && (
                    <ShareGameButton
                      game="mus"
                      variant="overlay"
                      winners={winners}
                      rivals={rivals}
                      createdAt={g.created_at}
                      image={g.image}
                      countsForStats={g.counts_for_stats}
                    />
                  )}
                  {confirming ? (
                    <div className="bg-black/60 backdrop-blur-sm rounded px-2 py-1">{deleteControl}</div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingId(g.id)}
                        title="Editar partida"
                        aria-label="Editar partida"
                        className="p-1.5 rounded bg-black/50 text-white/80 hover:text-gold-bright hover:bg-black/70 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(g.id)}
                        title="Deshacer partida"
                        aria-label="Deshacer partida"
                        className="p-1.5 rounded bg-black/50 text-white/80 hover:text-wine hover:bg-black/70 transition-colors"
                      >
                        <UndoIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex -space-x-3 shrink-0">
                      {winners.map((p) => (
                        <div
                          key={p.id}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold border-2"
                          style={{ backgroundColor: p.color, borderColor: p.color }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-lg text-[#f6e9c8] truncate flex items-center gap-1.5 drop-shadow">
                        <CrownIcon className="w-4 h-4 text-gold-bright shrink-0" />
                        {winners.map((p) => p.name).join(" y ")}
                      </p>
                      {rivals.length > 0 && (
                        <p className="text-xs text-[#f2e4bd]/80 truncate">
                          venció a {rivals.map((p) => p.name).join(" y ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#f2e4bd]/60 italic mt-1">{formatDate(g.created_at)}</p>
                </div>
              </li>
            );
          }

          return (
            <li
              key={g.id}
              className={`bg-card border-2 border-border rounded-sm px-4 py-3 flex items-center justify-between gap-3 transition-opacity ${
                removingId === g.id ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex -space-x-2 shrink-0">
                  {winners.map((p) => (
                    <div
                      key={p.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold text-sm border-2"
                      style={{ backgroundColor: p.color, borderColor: p.color }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-base truncate flex items-center gap-1.5">
                    <CrownIcon className="w-3.5 h-3.5 text-gold shrink-0" />
                    {winners.map((p) => p.name).join(" y ")}
                    {!g.counts_for_stats && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-gold/40 text-gold opacity-80">
                        No cuenta
                      </span>
                    )}
                  </p>
                  {rivals.length > 0 && (
                    <p className="text-xs opacity-55 truncate">venció a {rivals.map((p) => p.name).join(" y ")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!confirming && (
                  <ShareGameButton
                    game="mus"
                    variant="icon"
                    winners={winners}
                    rivals={rivals}
                    createdAt={g.created_at}
                    countsForStats={g.counts_for_stats}
                  />
                )}
                {!confirming && (
                  <>
                    <span className="text-xs opacity-50 whitespace-nowrap italic hidden sm:inline mr-1">
                      {formatDate(g.created_at)}
                    </span>
                    {editControl}
                  </>
                )}
                {deleteControl}
              </div>
            </li>
          );
        })}
      </ul>

      {visibleCount < games.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="w-full mt-4 py-2.5 rounded border-2 border-dashed border-border text-sm font-display font-semibold uppercase tracking-wide opacity-70 hover:opacity-100 hover:border-gold transition-colors"
        >
          Ver más
        </button>
      )}

      {editingGame && (
        <EditMusGameModal
          game={editingGame}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            load();
          }}
        />
      )}
    </div>
  );
}
