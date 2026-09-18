"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { CameraIcon, CheckIcon, ChevronDownIcon, CrownIcon, SearchIcon, ShieldIcon, SwordsIcon, XIcon } from "./icons";
import Skeleton from "./Skeleton";
import ImageEditModal from "./ImageEditModal";

const MAX_PLAYERS = 6;

export default function NewGameModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (winnerName: string) => void;
}) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [countsForStats, setCountsForStats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playersOpen, setPlayersOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const playersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playersOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (playersRef.current && !playersRef.current.contains(e.target as Node)) {
        setPlayersOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [playersOpen]);

  useEffect(() => {
    fetch("/api/players?game=catan")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setAllPlayers)
      .catch(() => setError("No se pudo cargar la lista de jugadores."))
      .finally(() => setLoading(false));
  }, []);

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
    return [...base].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [allPlayers, search, selectedIds]);

  const exactMatch = allPlayers.some((p) => p.name.toLowerCase() === search.trim().toLowerCase());
  const full = selectedIds.length >= MAX_PLAYERS;

  function toggleSelect(player: Player) {
    setError(null);
    setSelectedIds((prev) => {
      if (prev.includes(player.id)) return prev.filter((x) => x !== player.id);
      if (prev.length >= MAX_PLAYERS) return prev;
      return [...prev, player.id];
    });
    if (winnerId === player.id) setWinnerId(null);
  }

  async function createAndSelect(name: string) {
    const trimmed = name.trim();
    if (!trimmed || full) return;
    setError(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, game: "catan" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear el jugador");
        return;
      }
      const player: Player = await res.json();
      setAllPlayers((prev) => (prev.some((p) => p.id === player.id) ? prev : [...prev, player]));
      setSelectedIds((prev) =>
        prev.includes(player.id) || prev.length >= MAX_PLAYERS ? prev : [...prev, player.id]
      );
      setSearch("");
    } catch {
      setError("No se pudo crear el jugador. Comprueba tu conexión.");
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    setPendingFile(file);
  }

  async function confirm() {
    if (selectedIds.length < 2) {
      setError("Selecciona al menos 2 jugadores");
      return;
    }
    if (selectedIds.length > MAX_PLAYERS) {
      setError(`Máximo ${MAX_PLAYERS} jugadores`);
      return;
    }
    if (!winnerId) {
      setError("Marca quién ha ganado");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedIds, winnerId, image, countsForStats }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la partida");
        return;
      }
      const winner = allPlayers.find((p) => p.id === winnerId);
      onSaved(winner?.name ?? "¡Victoria!");
    } catch {
      setError("No se pudo guardar la partida. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  const ready = selectedIds.length >= 2 && Boolean(winnerId);

  return (
    <>
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
              <ShieldIcon className="w-5 h-5 text-wine" />
              Nueva Partida
            </h2>
            <button type="button" onClick={onClose} className="p-1 rounded opacity-60 hover:opacity-100" aria-label="Cerrar">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Jugadores */}
          <section className="mb-5 relative" ref={playersRef}>
            <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
              Convoca a los jugadores ({selectedIds.length}/{MAX_PLAYERS})
            </h3>

            <button
              type="button"
              onClick={() => setPlayersOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm hover:border-gold transition-colors"
            >
              <span className="opacity-70 flex items-center gap-1.5">
                <ShieldIcon className="w-3.5 h-3.5" />
                {selectedPlayers.length === 0 ? "Elegir jugadores…" : "Añadir o quitar jugadores"}
              </span>
              <ChevronDownIcon className={`w-4 h-4 opacity-60 transition-transform ${playersOpen ? "rotate-180" : ""}`} />
            </button>

            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedPlayers.map((p) => (
                  <span
                    key={p.id}
                    className="px-2.5 py-1 rounded text-xs font-display font-semibold text-[#f6e9c8] flex items-center gap-1.5"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name}
                    <button type="button" onClick={() => toggleSelect(p)} aria-label={`Quitar a ${p.name}`}>
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <AnimatePresence>
              {playersOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full mt-1 z-20"
                >
                  <div className="ornate bg-card rounded-sm overflow-hidden">
                    <div className="relative p-2 border-b-2 border-border">
                      <SearchIcon className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 opacity-50" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && search.trim() && !exactMatch) createAndSelect(search);
                        }}
                        placeholder="Buscar o crear jugador…"
                        disabled={full}
                        className="w-full pl-8 pr-2 py-1.5 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60 disabled:opacity-50"
                      />
                    </div>

                    {loading ? (
                      <div className="p-2 space-y-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-8 w-full" />
                        ))}
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto py-1">
                        {visiblePlayers.map((p) => {
                          const active = selectedIds.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleSelect(p)}
                              disabled={!active && full}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-display font-semibold text-left hover:bg-gold/10 transition-colors disabled:opacity-30"
                            >
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-[#f6e9c8] font-bold shrink-0"
                                style={{ backgroundColor: p.color }}
                              >
                                {p.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="flex-1">{p.name}</span>
                              {active && <CheckIcon className="w-4 h-4 text-gold shrink-0" />}
                            </button>
                          );
                        })}
                        {search.trim() !== "" && !exactMatch && !full && (
                          <button
                            type="button"
                            onClick={() => createAndSelect(search)}
                            className="w-full text-left px-3 py-2 text-sm font-display font-semibold border-t border-border text-forest hover:bg-forest/10 transition-colors"
                          >
                            + Crear &ldquo;{search.trim()}&rdquo;
                          </button>
                        )}
                        {visiblePlayers.length === 0 && search.trim() === "" && (
                          <p className="text-xs opacity-50 italic px-3 py-2">Escribe un nombre para crear al primer jugador.</p>
                        )}
                        {full && (
                          <p className="text-[11px] opacity-50 italic px-3 py-2">
                            Máximo {MAX_PLAYERS} jugadores por partida.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded border-2 border-dashed border-border text-sm font-display flex items-center justify-center gap-2 opacity-70 hover:opacity-100 hover:border-gold transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                Añadir foto (opcional)
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
            <p className="text-sm text-wine font-semibold flex items-center gap-1.5 mb-3">
              <SwordsIcon className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={confirm}
            disabled={!ready || saving}
            className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? "Sellando…" : "Confirmar Partida"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    <AnimatePresence>
      {pendingFile && (
        <ImageEditModal
          file={pendingFile}
          onCancel={() => setPendingFile(null)}
          onConfirm={(dataUrl) => {
            setImage(dataUrl);
            setPendingFile(null);
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}
