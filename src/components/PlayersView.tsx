"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Player } from "@/lib/types";
import type { GameId } from "@/lib/games";
import { gameBasePath } from "@/lib/games";
import RadialStat from "@/components/RadialStat";
import Skeleton from "@/components/Skeleton";
import { computeBadges, BADGE_TONE_CLASS } from "@/lib/badges";
import { CardsIcon, ShieldIcon, XIcon } from "@/components/icons";

export default function PlayersView({ game }: { game: GameId }) {
  const base = gameBasePath(game);
  const isMus = game === "mus";
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/players?game=${game}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setPlayers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [game]);

  async function createPlayer() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, game }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error ?? "No se pudo crear el jugador");
        return;
      }
      const player: Player = await res.json();
      setPlayers((prev) =>
        prev.some((p) => p.id === player.id)
          ? prev
          : [...prev, { ...player, games_played: 0, wins: 0 }]
      );
      setNewName("");
      setAdding(false);
    } catch {
      setCreateError("No se pudo crear el jugador. Comprueba tu conexión.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2">
          {isMus ? (
            <CardsIcon className="w-6 h-6 text-wine" />
          ) : (
            <ShieldIcon className="w-6 h-6 text-wine" />
          )}
          Jugadores
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="seal-btn shrink-0 px-3 py-1.5 rounded text-xs bg-forest text-[#f2e4bd] hover:brightness-110 flex items-center gap-1.5"
        >
          {adding ? <XIcon className="w-3.5 h-3.5" /> : <span className="text-base leading-none">+</span>}
          {adding ? "Cancelar" : "Nuevo jugador"}
        </button>
      </div>
      <p className="text-sm opacity-70 italic mb-4">
        {isMus
          ? "Los que se han sentado a la mesa de mus."
          : "Todos los que han cruzado espadas en la mesa."}
      </p>

      {adding && (
        <div className="ornate rounded-sm bg-card p-4 mb-6 flex flex-col sm:flex-row gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlayer()}
            placeholder="Nombre del nuevo aspirante…"
            className="flex-1 px-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60"
          />
          <button
            type="button"
            onClick={createPlayer}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 rounded bg-forest text-[#f2e4bd] text-sm font-display font-semibold uppercase tracking-wide hover:brightness-110 border-2 border-forest disabled:opacity-50"
          >
            {creating ? "Alistando…" : "Alistar"}
          </button>
          {createError && <p className="text-xs text-wine font-semibold sm:self-center">{createError}</p>}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-wine font-semibold">No se pudo cargar la lista. Comprueba tu conexión.</p>
      ) : players.length === 0 ? (
        <p className="text-sm opacity-60 italic">Aún no hay aspirantes registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p) => {
            const games = p.games_played ?? 0;
            const wins = p.wins ?? 0;
            const rate = games > 0 ? Math.round((wins / games) * 100) : 0;
            const badges = computeBadges({ games_played: games, wins });
            return (
              <Link
                href={`${base}/jugadores/${p.id}`}
                key={p.id}
                className="ornate rounded-sm p-4 flex items-center gap-4 hover:brightness-105 transition-all"
              >
                <RadialStat percent={rate} color={p.color} size={56}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold text-sm border-2"
                    style={{ backgroundColor: p.color, borderColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                </RadialStat>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg truncate">{p.name}</p>
                  <p className="text-xs opacity-70">
                    {games} {games === 1 ? "partida" : "partidas"} · {wins} {wins === 1 ? "victoria" : "victorias"}
                  </p>
                  <p className="text-xs font-display font-semibold mb-1" style={{ color: p.color }}>
                    {rate}% de gloria
                  </p>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {badges.slice(0, 2).map((b) => (
                        <span
                          key={b.label}
                          className={`text-[9px] font-display font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${BADGE_TONE_CLASS[b.tone]}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
