"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { SearchIcon, ShieldIcon, XIcon } from "./icons";

export default function MusTeamPicker({
  title,
  allPlayers,
  setAllPlayers,
  selectedIds,
  onChangeSelected,
  excludeIds,
}: {
  title: string;
  allPlayers: Player[];
  setAllPlayers: (updater: (prev: Player[]) => Player[]) => void;
  selectedIds: string[];
  onChangeSelected: (ids: string[]) => void;
  excludeIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = selectedIds.length >= 2;

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => allPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [allPlayers, selectedIds]
  );

  const suggestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allPlayers
      .filter((p) => !selectedIds.includes(p.id) && !excludeIds.includes(p.id))
      .filter((p) => (term ? p.name.toLowerCase().includes(term) : true))
      .slice(0, 6);
  }, [allPlayers, selectedIds, excludeIds, search]);

  const exactMatch = allPlayers.some(
    (p) => p.name.toLowerCase() === search.trim().toLowerCase()
  );

  function addExisting(player: Player) {
    if (full) return;
    setError(null);
    onChangeSelected([...selectedIds, player.id]);
    setSearch("");
    setSuggestionsOpen(false);
  }

  function removeSelected(id: string) {
    onChangeSelected(selectedIds.filter((x) => x !== id));
  }

  async function createAndAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed || full) return;
    setError(null);
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
    onChangeSelected([...selectedIds, player.id]);
    setSearch("");
    setSuggestionsOpen(false);
  }

  function handleSearchEnter() {
    if (full) return;
    const term = search.trim();
    if (!term) return;
    const match = allPlayers.find((p) => p.name.toLowerCase() === term.toLowerCase());
    if (match) {
      if (!excludeIds.includes(match.id)) addExisting(match);
    } else {
      createAndAdd(term);
    }
  }

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 opacity-80">
        <ShieldIcon className="w-4 h-4 text-wine" />
        {title}
      </h3>

      {selectedPlayers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
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
                className="ml-0.5 opacity-80 hover:opacity-100"
                aria-label={`Quitar a ${p.name}`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {full ? (
        <p className="text-xs opacity-50 italic px-1 py-2.5">Pareja completa.</p>
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

      {error && <p className="text-xs text-wine font-semibold mt-1.5">{error}</p>}
    </div>
  );
}
