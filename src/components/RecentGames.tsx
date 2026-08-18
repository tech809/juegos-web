"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameRecord } from "@/lib/types";
import { CrownIcon, ScrollIcon, UndoIcon } from "./icons";
import Skeleton from "./Skeleton";

function formatDate(iso: string) {
  const date = new Date(iso + "Z");
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentGames({ refreshKey }: { refreshKey?: number }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => setGames(data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [refreshKey]);

  async function undoGame(id: string) {
    setConfirmingId(null);
    setRemovingId(id);
    const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
    if (res.ok) {
      setGames((prev) => prev.filter((g) => g.id !== id));
    }
    setRemovingId(null);
  }

  if (loading) {
    return (
      <div className="mt-10 space-y-3">
        <Skeleton className="h-4 w-40 mx-auto" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <p className="text-sm opacity-60 mt-8 text-center italic flex items-center justify-center gap-2">
        <ScrollIcon className="w-4 h-4" /> La crónica está en blanco. ¡Sé el primero en escribir tu leyenda!
      </p>
    );
  }

  return (
    <div className="mt-10">
      <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
        <ScrollIcon className="w-4 h-4 shrink-0" />
        Crónica reciente
      </h3>
      <ul className="space-y-3">
        {games.map((g) => {
          const confirming = confirmingId === g.id;
          const others = g.players.filter((p) => p.id !== g.winner_id);
          return (
            <li
              key={g.id}
              className={`bg-card border-2 border-border rounded-sm overflow-hidden flex transition-opacity ${
                removingId === g.id ? "opacity-40" : ""
              }`}
            >
              {g.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.image}
                  alt="Foto de la partida"
                  className="w-24 sm:w-28 shrink-0 object-cover"
                />
              )}
              <div className="flex-1 min-w-0 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/jugadores/${g.winner_id}`}
                    className="flex items-center gap-2 min-w-0 hover:brightness-110"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold text-sm border-2 shrink-0"
                      style={{ backgroundColor: g.winner_color, borderColor: g.winner_color }}
                    >
                      {g.winner_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-base truncate flex items-center gap-1">
                        <CrownIcon className="w-3.5 h-3.5 text-gold shrink-0" />
                        {g.winner_name}
                      </p>
                      {others.length > 0 && (
                        <p className="text-xs opacity-55 truncate">
                          venció a {others.map((p) => p.name).join(", ")}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  {confirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] italic opacity-70 hidden sm:inline">¿Seguro?</span>
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
                        className="text-[11px] font-display uppercase px-2 py-1 rounded border border-border opacity-70 hover:opacity-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs opacity-50 italic">{formatDate(g.created_at)}</span>
                  )}
                  {!confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(g.id)}
                      title="Deshacer partida"
                      aria-label="Deshacer partida"
                      className="p-1.5 rounded text-wine/70 hover:text-wine hover:bg-wine/10 transition-colors"
                    >
                      <UndoIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
