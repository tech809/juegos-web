"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameRecord, Player } from "@/lib/types";
import { CrownIcon, PencilIcon, SearchIcon, ShieldIcon, SwordsIcon, XIcon } from "./icons";
import Skeleton from "./Skeleton";
import { sortByRecentActivity } from "@/lib/player-order";
import GameMediaField from "./GameMediaField";
import GameNotesField from "./GameNotesField";
import { removeVideo, uploadVideo, type MediaValue } from "@/lib/media";

/**
 * Edición de una partida de catán ya escrita en la crónica:
 * quiénes jugaron, quién ganó, la foto y si cuenta para las estadísticas.
 */
export default function EditGameModal({
  game,
  onClose,
  onSaved,
}: {
  game: GameRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => game.players.map((p) => p.id));
  const [winnerIds, setWinnerIds] = useState<string[]>(() => game.winners.map((p) => p.id));
  const [date, setDate] = useState(game.created_at.slice(0, 10));
  const [notes, setNotes] = useState(game.notes ?? "");
  const [media, setMedia] = useState<MediaValue>(() => ({
    image: game.image ?? null,
    video: null,
    existingVideo: Boolean(game.has_video),
  }));
  const [countsForStats, setCountsForStats] = useState(game.counts_for_stats);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/players?game=catan")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Player[]) => {
        // por si algún jugador de la partida ya no apareciera en la lista
        const known = new Set(data.map((p) => p.id));
        const extras = game.players.filter((p) => !known.has(p.id));
        setAllPlayers([...data, ...extras]);
      })
      .catch(() => setError("No se pudo cargar la lista de jugadores."))
      .finally(() => setLoading(false));
  }, [game.players]);

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => allPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [allPlayers, selectedIds]
  );

  const visiblePlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = !term
      ? allPlayers
      : // los ya seleccionados se quedan siempre visibles, aunque no coincidan con la búsqueda
        allPlayers.filter((p) => selectedIds.includes(p.id) || p.name.toLowerCase().includes(term));
    return sortByRecentActivity(base);
  }, [allPlayers, search, selectedIds]);

  function toggleSelect(player: Player) {
    setError(null);
    setSelectedIds((prev) =>
      prev.includes(player.id) ? prev.filter((x) => x !== player.id) : prev.length < 20 ? [...prev, player.id] : prev
    );
    setWinnerIds((prev) => prev.filter((id) => id !== player.id));
  }

  async function confirm() {
    if (selectedIds.length < 2) {
      setError("Selecciona al menos 2 jugadores");
      return;
    }
    if (winnerIds.length === 0) {
      setError("Marca quién ha ganado");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedIds, winnerIds, date, image: media.image, notes, countsForStats }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la partida");
        return;
      }
      try {
        if (media.video) await uploadVideo(game.id, media.video);
        else if (game.has_video && !media.existingVideo) await removeVideo(game.id);
      } catch (e) {
        // la partida ya se guardó con la miniatura nueva: se devuelve la anterior para no dejarla a medias
        await fetch(`/api/games/${game.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: game.image ?? null }),
        }).catch(() => {});
        setError(e instanceof Error ? e.message : "No se pudo guardar el vídeo");
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo guardar la partida. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  const ready = selectedIds.length >= 2 && winnerIds.length > 0 && Boolean(date);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 z-40 flex items-end sm:items-center justify-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
          className="ornate rounded-t-sm sm:rounded-sm bg-card w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] overflow-y-auto p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <PencilIcon className="w-5 h-5 text-wine" />
              Corregir Partida
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100" aria-label="Cerrar">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Jugadores */}
          <section className="mb-5">
            <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
              Quiénes jugaron ({selectedIds.length}/20)
            </h3>
            <div className="relative mb-2">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jugador…"
                className="w-full pl-9 pr-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60"
              />
            </div>

            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-20" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {visiblePlayers.map((p) => {
                  const active = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelect(p)}
                      disabled={!active && selectedIds.length >= 20}
                      className={`px-3 py-1.5 rounded text-sm font-display font-semibold border-2 transition-all flex items-center gap-1.5 ${
                        active ? "text-[#f6e9c8] shadow-md scale-105" : "bg-parchment-deep text-foreground/70 border-border hover:border-gold"
                      }`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                    >
                      <ShieldIcon className="w-3.5 h-3.5 opacity-80" />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Ganador */}
          <AnimatePresence>
            {selectedPlayers.length >= 2 && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5"
              >
                <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
                  ¿Quién ha ganado?
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((p) => {
                    const isWinner = winnerIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setWinnerIds((prev) => prev.includes(p.id) ? prev.filter((id) => id !== p.id) : prev.length < 2 ? [...prev, p.id] : prev)}
                        aria-pressed={isWinner}
                        className={`px-3 py-1.5 rounded text-sm font-display font-bold border-2 flex items-center gap-1.5 transition-all ${
                          isWinner
                            ? "bg-gold-bright border-gold-bright text-wine scale-105 shadow-lg"
                            : "bg-parchment-deep border-border opacity-80 hover:opacity-100"
                        }`}
                      >
                        {isWinner && <CrownIcon className="w-4 h-4" />}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <label className="block mb-5 text-xs font-display font-semibold uppercase tracking-[0.15em] opacity-70">
            Fecha de la partida
            <input type="date" value={date} max={new Date().toLocaleDateString("sv-SE")} onChange={(e) => setDate(e.target.value)}
              className="block mt-2 w-full px-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm text-foreground" />
          </label>

          {/* Foto */}
          <section className="mb-5">
            <GameMediaField value={media} onChange={setMedia} gameId={game.id} />
          </section>

          <GameNotesField value={notes} onChange={setNotes} />

          {/* Cuenta para estadísticas */}
          <section className="mb-5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={countsForStats}
                onChange={(e) => setCountsForStats(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[var(--gold)] shrink-0"
              />
              <span className="text-sm">
                Todos los jugadores tienen ya varias partidas de experiencia
                <span className="block text-xs opacity-60 italic mt-0.5">
                  {countsForStats
                    ? "Esta partida contará para las estadísticas y el ranking."
                    : "Se guardará en la crónica, pero no contará como victoria ni partida jugada."}
                </span>
              </span>
            </label>
          </section>

          {error && (
            <p className="text-sm text-wine font-semibold flex items-start gap-1.5 mb-3">
              <SwordsIcon className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!ready || saving}
            className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? "Sellando…" : "Guardar cambios"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
