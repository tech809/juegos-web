"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MusGameRecord, Player } from "@/lib/types";
import { CrownIcon, PencilIcon, SearchIcon, SwordsIcon, XIcon } from "./icons";
import Skeleton from "./Skeleton";
import GameMediaField from "./GameMediaField";
import GameNotesField from "./GameNotesField";
import { removeVideo, uploadVideo, type MediaValue } from "@/lib/media";

/**
 * Edición de una partida de mus ya escrita en la crónica:
 * las parejas, qué pareja ganó, la foto y si cuenta para las estadísticas.
 */
export default function EditMusGameModal({
  game,
  onClose,
  onSaved,
}: {
  game: MusGameRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialPlayers = useMemo(
    () => [...game.teams[0].players, ...game.teams[1].players],
    [game.teams]
  );

  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialPlayers.map((p) => p.id));
  const [winnerTeam, setWinnerTeam] = useState<0 | 1 | null>(game.winner_team);
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
    fetch("/api/players?game=mus")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Player[]) => {
        // por si algún jugador de la partida ya no apareciera en la lista
        const known = new Set(data.map((p) => p.id));
        setAllPlayers([...data, ...initialPlayers.filter((p) => !known.has(p.id))]);
      })
      .catch(() => setError("No se pudo cargar la lista de jugadores."))
      .finally(() => setLoading(false));
  }, [initialPlayers]);

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => allPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [allPlayers, selectedIds]
  );

  const teamA = selectedPlayers.slice(0, 2);
  const teamB = selectedPlayers.slice(2, 4);
  const full = selectedIds.length >= 4;

  const visiblePlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allPlayers;
    // los ya seleccionados se quedan siempre visibles, aunque no coincidan con la búsqueda
    return allPlayers.filter((p) => selectedIds.includes(p.id) || p.name.toLowerCase().includes(term));
  }, [allPlayers, search, selectedIds]);

  function toggleSelect(player: Player) {
    setError(null);
    setSelectedIds((prev) => {
      if (prev.includes(player.id)) {
        setWinnerTeam(null);
        return prev.filter((x) => x !== player.id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, player.id];
    });
  }

  async function confirm() {
    if (!full) {
      setError("Selecciona a los 4 jugadores");
      return;
    }
    if (winnerTeam === null) {
      setError("Marca qué pareja ha ganado");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/mus/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: teamA.map((p) => p.id),
          teamB: teamB.map((p) => p.id),
          winnerTeam,
          date,
          image: media.image,
          notes,
          countsForStats,
        }),
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
        await fetch(`/api/mus/games/${game.id}`, {
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

  const ready = full && winnerTeam !== null;

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
              Corregir Partida de Mus
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100" aria-label="Cerrar">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Selección de 4 jugadores */}
          <section className="mb-5">
            <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
              Los cuatro jugadores ({selectedIds.length}/4)
            </h3>
            <div className="relative mb-2">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar jugador…"
                disabled={full}
                className="w-full pl-9 pr-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60 disabled:opacity-50"
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
                  const idx = selectedIds.indexOf(p.id);
                  const active = idx !== -1;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleSelect(p)}
                      disabled={!active && full}
                      className={`px-3 py-1.5 rounded text-sm font-display font-semibold border-2 transition-all flex items-center gap-1.5 disabled:opacity-30 ${
                        active ? "text-[#f6e9c8] shadow-md scale-105" : "bg-parchment-deep text-foreground/70 border-border hover:border-gold"
                      }`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                    >
                      {active && <span className="text-[10px] font-black">{idx + 1}</span>}
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] opacity-50 italic mt-1.5">
              Los 2 primeros forman la Pareja 1, los 2 siguientes la Pareja 2. Para recolocar a
              alguien, quítalo y vuelve a elegirlo en el orden que quieras.
            </p>
          </section>

          {/* Parejas y ganadora */}
          <AnimatePresence>
            {full && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5"
              >
                <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
                  ¿Qué pareja ha ganado?
                </h3>
                <div className="flex flex-col gap-2.5">
                  {[teamA, teamB].map((team, idx) => {
                    const isWinner = winnerTeam === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setWinnerTeam(idx as 0 | 1)}
                        className={`flex items-center gap-3 p-3 rounded border-2 transition-all text-left ${
                          isWinner
                            ? "bg-gold-bright border-gold-bright text-wine scale-[1.02] shadow-lg"
                            : "bg-parchment-deep border-border opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex -space-x-3 shrink-0">
                          {team.map((p) => (
                            <div
                              key={p.id}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold border-2"
                              style={{ backgroundColor: p.color, borderColor: p.color }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-sm truncate flex items-center gap-1.5">
                            {isWinner && <CrownIcon className="w-4 h-4 text-wine shrink-0" />}
                            {team.map((p) => p.name).join(" y ")}
                          </p>
                        </div>
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
