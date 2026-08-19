"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import { PLAYER_COLORS } from "@/lib/colors";
import { CheckIcon, MergeIcon, PencilIcon, SearchIcon, SwordsIcon, XIcon } from "./icons";

/**
 * Edición de un jugador: renombrar, cambiar color, fusionarlo con otro
 * del mismo juego o borrarlo (solo si no tiene historial).
 */
export default function PlayerEditModal({
  player,
  players,
  onClose,
  onChanged,
}: {
  player: Player;
  /** Todos los jugadores del mismo juego (para poder fusionar). */
  players: Player[];
  onClose: () => void;
  /** Se llama tras cualquier cambio guardado, para recargar la lista. */
  onChanged: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [color, setColor] = useState(player.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  const others = useMemo(
    () => players.filter((p) => p.id !== player.id),
    [players, player.id]
  );

  const mergeCandidates = useMemo(() => {
    const term = mergeSearch.trim().toLowerCase();
    if (!term) return others;
    return others.filter((p) => p.name.toLowerCase().includes(term));
  }, [others, mergeSearch]);

  const mergeTarget = others.find((p) => p.id === mergeTargetId) ?? null;
  const dirty = name.trim() !== player.name || color !== player.color;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre no puede quedar vacío");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el jugador");
        return;
      }
      onChanged();
      onClose();
    } catch {
      setError("No se pudo guardar el jugador. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  async function removePlayer() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${player.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo borrar el jugador");
        setConfirmingDelete(false);
        return;
      }
      onChanged();
      onClose();
    } catch {
      setError("No se pudo borrar el jugador. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  async function merge() {
    if (!mergeTarget) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/players/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: player.id, targetId: mergeTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo fusionar el jugador");
        return;
      }
      onChanged();
      onClose();
    } catch {
      setError("No se pudo fusionar el jugador. Comprueba tu conexión.");
    } finally {
      setSaving(false);
    }
  }

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
              Editar jugador
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded opacity-60 hover:opacity-100"
              aria-label="Cerrar"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Nombre */}
          <section className="mb-5">
            <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
              Nombre
            </h3>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="w-full px-3 py-2.5 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </section>

          {/* Color */}
          <section className="mb-5">
            <h3 className="text-xs font-display font-semibold uppercase tracking-[0.15em] mb-2 opacity-70">
              Color del estandarte
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {PLAYER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-transform ${
                    color === c ? "scale-110 border-gold-bright shadow-lg" : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <CheckIcon className="w-5 h-5 text-[#f6e9c8]" />}
                </button>
              ))}
            </div>
          </section>

          {/* Fusionar */}
          <section className="mb-5">
            <button
              type="button"
              onClick={() => setMergeOpen((v) => !v)}
              className="w-full py-2.5 rounded border-2 border-dashed border-border text-sm font-display font-semibold uppercase tracking-wide opacity-70 hover:opacity-100 hover:border-gold transition-colors flex items-center justify-center gap-2"
            >
              <MergeIcon className="w-4 h-4" />
              {mergeOpen ? "Cancelar fusión" : "Fusionar con otro jugador"}
            </button>

            <AnimatePresence>
              {mergeOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs opacity-70 italic mt-3 mb-2">
                    Todas las partidas y el histórico de{" "}
                    <strong className="not-italic">{player.name}</strong> pasarán al jugador que
                    elijas, y <strong className="not-italic">{player.name}</strong> desaparecerá de
                    la lista.
                  </p>

                  {others.length === 0 ? (
                    <p className="text-xs opacity-60 italic">
                      No hay otros jugadores en este juego con los que fusionar.
                    </p>
                  ) : (
                    <>
                      <div className="relative mb-2">
                        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                          value={mergeSearch}
                          onChange={(e) => setMergeSearch(e.target.value)}
                          placeholder="Buscar jugador destino…"
                          className="w-full pl-9 pr-3 py-2 rounded border-2 border-border bg-parchment-deep text-sm focus:outline-none focus:ring-2 focus:ring-gold placeholder:italic placeholder:opacity-60"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {mergeCandidates.map((p) => {
                          const active = mergeTargetId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setMergeTargetId(active ? null : p.id)}
                              className={`px-3 py-2 rounded text-sm font-display font-semibold border-2 transition-all ${
                                active
                                  ? "text-[#f6e9c8] shadow-md scale-105"
                                  : "bg-parchment-deep text-foreground/70 border-border hover:border-gold"
                              }`}
                              style={active ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                        {mergeCandidates.length === 0 && (
                          <p className="text-xs opacity-50 italic py-1.5">Ningún jugador coincide.</p>
                        )}
                      </div>

                      {mergeTarget && (
                        <button
                          type="button"
                          onClick={merge}
                          disabled={saving}
                          className="seal-btn w-full py-2.5 rounded bg-forest text-[#f2e4bd] text-sm hover:brightness-110 disabled:opacity-50"
                        >
                          {saving
                            ? "Fusionando…"
                            : `Fusionar ${player.name} dentro de ${mergeTarget.name}`}
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {error && (
            <p className="text-sm text-wine font-semibold flex items-start gap-1.5 mb-3">
              <SwordsIcon className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || !name.trim()}
            className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {saving ? "Sellando…" : "Guardar cambios"}
          </button>

          {/* Borrar */}
          <div className="mt-4 pt-4 border-t-2 border-border">
            {confirmingDelete ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[11px] italic opacity-80">¿Seguro?</span>
                <button
                  type="button"
                  onClick={removePlayer}
                  disabled={saving}
                  className="text-[11px] font-display font-bold uppercase px-3 py-2 rounded bg-wine text-[#f6e9c8] hover:brightness-110 disabled:opacity-40"
                >
                  Sí, borrar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-[11px] font-display uppercase px-3 py-2 rounded border-2 border-border hover:border-gold"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirmingDelete(true);
                }}
                className="w-full py-2 rounded text-xs font-display font-semibold uppercase tracking-wide text-wine/80 hover:text-wine hover:bg-wine/10 transition-colors"
              >
                Borrar jugador
              </button>
            )}
            <p className="text-[11px] opacity-55 italic text-center mt-1.5">
              Solo se puede borrar si no tiene ninguna partida ni histórico. Si ya jugó, fusiónalo.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
