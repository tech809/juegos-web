"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { CrownIcon, SearchIcon, ShieldIcon, SwordsIcon, XIcon } from "./icons";
import Confetti from "./Confetti";
import Skeleton from "./Skeleton";
import WinnerModal from "./WinnerModal";

export default function NewGameForm({ onSaved }: { onSaved?: () => void }) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function loadPlayers() {
    setLoading(true);
    try {
      const res = await fetch("/api/players");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAllPlayers(data);
    } catch {
      setError("No se pudo cargar la lista de jugadores. Comprueba tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const selectedPlayers = useMemo(
    () => allPlayers.filter((p) => selectedIds.includes(p.id)),
    [allPlayers, selectedIds]
  );

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allPlayers
      .filter((p) => !selectedIds.includes(p.id))
      .filter((p) => (term ? p.name.toLowerCase().includes(term) : true))
      .slice(0, 6);
  }, [allPlayers, selectedIds, search]);

  const exactMatch = allPlayers.some(
    (p) => p.name.toLowerCase() === search.trim().toLowerCase()
  );

  function addExisting(player: Player) {
    setError(null);
    setSelectedIds((prev) => (prev.includes(player.id) ? prev : [...prev, player.id]));
    setSearch("");
    setSuggestionsOpen(false);
  }

  function removeSelected(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  async function createAndAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear el jugador");
        return;
      }
      const player: Player = await res.json();
      setAllPlayers((prev) => (prev.some((p) => p.id === player.id) ? prev : [...prev, player]));
      setSelectedIds((prev) => (prev.includes(player.id) ? prev : [...prev, player.id]));
      setSearch("");
      setSuggestionsOpen(false);
    } catch {
      setError("No se pudo crear el jugador. Comprueba tu conexión.");
    }
  }

  function handleSearchEnter() {
    const term = search.trim();
    if (!term) return;
    const match = allPlayers.find((p) => p.name.toLowerCase() === term.toLowerCase());
    if (match) {
      addExisting(match);
      return;
    }
    if (suggestions.length === 1) {
      // Coincidencia parcial única: la damos por buena para no obligar a tocar la pantalla.
      addExisting(suggestions[0]);
      return;
    }
    if (suggestions.length > 1) {
      // Hay varios nombres parecidos: no creamos uno nuevo por error, que elija de la lista.
      return;
    }
    createAndAdd(term);
  }

  function openModal() {
    if (selectedIds.length < 2) {
      setError("Se necesitan al menos 2 aspirantes al trono");
      return;
    }
    setError(null);
    setShowModal(true);
  }

  async function confirmWinner(winnerId: string, image: string | null) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: selectedIds, winnerId, image }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la partida");
        return;
      }
      const winner = allPlayers.find((p) => p.id === winnerId);
      setShowModal(false);
      setCelebrate(winner?.name ?? "¡Victoria!");
      setBurst((k) => k + 1);
      setSelectedIds([]);
      onSaved?.();
      setTimeout(() => setCelebrate(null), 3000);
    } catch {
      setError("No se pudo guardar la partida. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Confetti burstKey={burst} />
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
          <ShieldIcon className="w-6 h-6 text-wine" />
          Nueva Partida
        </h2>
        <p className="text-sm opacity-70 italic">Convoca a los jugadores de la partida.</p>
      </div>

      <section>
        {selectedPlayers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedPlayers.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1.5 rounded text-sm font-display font-semibold flex items-center gap-1.5 text-[#f6e9c8]"
                style={{ backgroundColor: p.color }}
              >
                <ShieldIcon className="w-3.5 h-3.5 opacity-80" />
                {p.name}
                <button
                  type="button"
                  onClick={() => removeSelected(p.id)}
                  className="-mr-1 p-1.5 opacity-80 hover:opacity-100"
                  aria-label={`Quitar a ${p.name}`}
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <Skeleton className="h-11 w-full" />
        ) : (
          <div className="relative">
            <div className="relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => setSuggestionsOpen(true)}
                onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchEnter()}
                placeholder="Buscar o añadir jugador…"
                className="w-full pl-9 pr-3 py-2.5 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60"
              />
            </div>

            <AnimatePresence>
              {suggestionsOpen && (search.trim() !== "" || suggestions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-10 mt-1 w-full bg-card border-2 border-border rounded-sm shadow-lg overflow-hidden"
                >
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addExisting(p)}
                      className="w-full text-left px-3 py-2 text-sm font-display flex items-center gap-2 hover:bg-gold/10"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-[#f6e9c8] font-bold"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      {p.name}
                    </button>
                  ))}
                  {search.trim() !== "" && !exactMatch && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => createAndAdd(search)}
                      className="w-full text-left px-3 py-2 text-sm font-display text-forest hover:bg-forest/10 border-t border-border"
                    >
                      + Crear jugador &ldquo;{search.trim()}&rdquo;
                    </button>
                  )}
                  {suggestions.length === 0 && search.trim() === "" && (
                    <p className="px-3 py-2 text-xs opacity-50 italic">Escribe un nombre para buscar o crear.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </section>

      {error && !showModal && (
        <p className="text-sm text-wine font-semibold flex items-center gap-1.5">
          <SwordsIcon className="w-4 h-4" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={openModal}
        className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-lg hover:brightness-110 active:scale-[0.99] transition-all"
      >
        Sellar la Partida
      </button>

      {showModal && (
        <WinnerModal
          players={selectedPlayers}
          saving={saving}
          error={error}
          onClose={() => setShowModal(false)}
          onConfirm={confirmWinner}
        />
      )}

      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85, rotate: -2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: -14, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="fixed inset-x-0 bottom-6 flex justify-center px-4 pointer-events-none z-50"
          >
            <div className="ornate rounded-sm bg-wine text-[#f6e9c8] px-6 py-4 flex items-center gap-3">
              <CrownIcon className="w-8 h-8 text-gold-bright animate-shimmer" />
              <div className="text-left">
                <p className="font-display text-[10px] uppercase tracking-[0.2em] text-gold-bright/90">
                  Se proclama vencedor
                </p>
                <p className="font-display text-xl font-bold">{celebrate}</p>
              </div>
              <CrownIcon className="w-8 h-8 text-gold-bright animate-shimmer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
