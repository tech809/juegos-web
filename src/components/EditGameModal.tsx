"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameRecord, Player } from "@/lib/types";
import { CameraIcon, CrownIcon, PencilIcon, SearchIcon, ShieldIcon, SwordsIcon, XIcon } from "./icons";
import Skeleton from "./Skeleton";
import { resizeImage } from "@/lib/image";

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
  const [winnerId, setWinnerId] = useState<string | null>(game.winner_id);
  const [image, setImage] = useState<string | null>(game.image ?? null);
  const [processingImage, setProcessingImage] = useState(false);
  const [countsForStats, setCountsForStats] = useState(game.counts_for_stats);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!term) return allPlayers;
    // los ya seleccionados se quedan siempre visibles, aunque no coincidan con la búsqueda
    return allPlayers.filter((p) => selectedIds.includes(p.id) || p.name.toLowerCase().includes(term));
  }, [allPlayers, search, selectedIds]);

  function toggleSelect(player: Player) {
    setError(null);
    setSelectedIds((prev) =>
      prev.includes(player.id) ? prev.filter((x) => x !== player.id) : [...prev, player.id]
    );
    if (winnerId === player.id) setWinnerId(null);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setProcessingImage(true);
    try {
      setImage(await resizeImage(file));
    } catch {
      // si falla el procesado, simplemente no se cambia la imagen
    } finally {
      setProcessingImage(false);
    }
  }

  async function confirm() {
    if (selectedIds.length < 2) {
      setError("Selecciona al menos 2 jugadores");
      return;
    }
    if (!winnerId) {
      setError("Marca quién ha ganado");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedIds, winnerId, image, countsForStats }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la partida");
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo guardar la partida. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  const ready = selectedIds.length >= 2 && Boolean(winnerId);

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
              Quiénes jugaron
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
                    const isWinner = winnerId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setWinnerId(p.id)}
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

          {/* Foto */}
          <section className="mb-5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {image ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Foto de la partida" className="w-full h-36 object-cover rounded border-2 border-border" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1"
                  aria-label="Quitar imagen"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={processingImage}
                  className="absolute bottom-1.5 right-1.5 bg-black/60 text-white rounded px-2 py-1 text-[11px] font-display uppercase tracking-wide"
                >
                  {processingImage ? "Procesando…" : "Cambiar"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={processingImage}
                className="w-full py-3 rounded border-2 border-dashed border-border text-sm font-display flex items-center justify-center gap-2 opacity-70 hover:opacity-100 hover:border-gold transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                {processingImage ? "Procesando…" : "Añadir foto (opcional)"}
              </button>
            )}
          </section>

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
