"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Player } from "@/lib/types";
import MusTeamPicker from "@/components/MusTeamPicker";
import MusWinnerModal from "@/components/MusWinnerModal";
import RecentMusGames from "@/components/RecentMusGames";
import Confetti from "@/components/Confetti";
import Skeleton from "@/components/Skeleton";
import { CardsIcon, CrownIcon, SwordsIcon } from "@/components/icons";

export default function MusPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamA, setTeamA] = useState<string[]>([]);
  const [teamB, setTeamB] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/players")
      .then((r) => r.json())
      .then(setAllPlayers)
      .finally(() => setLoading(false));
  }, []);

  const teamAPlayers = useMemo(
    () => teamA.map((id) => allPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [teamA, allPlayers]
  );
  const teamBPlayers = useMemo(
    () => teamB.map((id) => allPlayers.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [teamB, allPlayers]
  );

  function openModal() {
    if (teamA.length !== 2 || teamB.length !== 2) {
      setError("Cada pareja necesita exactamente 2 jugadores");
      return;
    }
    setError(null);
    setShowModal(true);
  }

  async function confirmWinner(winnerTeam: 0 | 1, image: string | null) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/mus/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamA, teamB, winnerTeam, image }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo guardar la partida");
      return;
    }
    const winners = winnerTeam === 0 ? teamAPlayers : teamBPlayers;
    setShowModal(false);
    setCelebrate(winners.map((p) => p.name).join(" y "));
    setBurst((k) => k + 1);
    setTeamA([]);
    setTeamB([]);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setCelebrate(null), 3000);
  }

  return (
    <div>
      <Confetti burstKey={burst} />
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 text-gold mb-1">
          <CardsIcon className="w-6 h-6 opacity-70" />
          <span className="font-display text-xs sm:text-sm tracking-[0.25em] uppercase opacity-80">
            Registra el envite
          </span>
          <CardsIcon className="w-6 h-6 opacity-70 scale-x-[-1]" />
        </div>
      </div>

      <div className="ornate rounded-sm p-5 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
            <CardsIcon className="w-6 h-6 text-wine" />
            Nueva Partida de Mus
          </h2>
          <p className="text-sm opacity-70 italic">Reparte a los cuatro jugadores en dos parejas.</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-6">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            <MusTeamPicker
              title="Pareja 1"
              allPlayers={allPlayers}
              setAllPlayers={setAllPlayers}
              selectedIds={teamA}
              onChangeSelected={setTeamA}
              excludeIds={teamB}
            />
            <MusTeamPicker
              title="Pareja 2"
              allPlayers={allPlayers}
              setAllPlayers={setAllPlayers}
              selectedIds={teamB}
              onChangeSelected={setTeamB}
              excludeIds={teamA}
            />
          </div>
        )}

        {error && (
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
      </div>

      {showModal && (
        <MusWinnerModal
          teamA={teamAPlayers}
          teamB={teamBPlayers}
          saving={saving}
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
                  Se proclama vencedora
                </p>
                <p className="font-display text-xl font-bold">{celebrate}</p>
              </div>
              <CrownIcon className="w-8 h-8 text-gold-bright animate-shimmer" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RecentMusGames refreshKey={refreshKey} />
    </div>
  );
}
