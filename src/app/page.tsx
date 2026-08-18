"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import NewGameModal from "@/components/NewGameModal";
import RecentGames from "@/components/RecentGames";
import Confetti from "@/components/Confetti";
import { CrownIcon, ShieldIcon, SwordsIcon } from "@/components/icons";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(true);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  function handleSaved(winnerName: string) {
    setModalOpen(false);
    setCelebrate(winnerName);
    setBurst((k) => k + 1);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setCelebrate(null), 3000);
  }

  return (
    <div>
      <Confetti burstKey={burst} />

      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 text-gold mb-3">
          <SwordsIcon className="w-6 h-6 opacity-70" />
          <span className="font-display text-xs sm:text-sm tracking-[0.25em] uppercase opacity-80">
            Registra tu conquista
          </span>
          <SwordsIcon className="w-6 h-6 opacity-70 scale-x-[-1]" />
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="seal-btn inline-flex items-center gap-2 px-6 py-3 rounded bg-wine text-[#f6e9c8] hover:brightness-110 active:scale-[0.99] transition-all"
        >
          <ShieldIcon className="w-4 h-4" />
          Nueva Partida
        </button>
      </div>

      {modalOpen && (
        <NewGameModal onClose={() => setModalOpen(false)} onSaved={handleSaved} />
      )}

      <RecentGames refreshKey={refreshKey} />

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
