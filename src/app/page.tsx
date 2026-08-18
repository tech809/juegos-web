"use client";

import { useState } from "react";
import NewGameForm from "@/components/NewGameForm";
import RecentGames from "@/components/RecentGames";
import { SwordsIcon } from "@/components/icons";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 text-gold mb-1">
          <SwordsIcon className="w-6 h-6 opacity-70" />
          <span className="font-display text-xs sm:text-sm tracking-[0.25em] uppercase opacity-80">
            Registra tu conquista
          </span>
          <SwordsIcon className="w-6 h-6 opacity-70 scale-x-[-1]" />
        </div>
      </div>

      <div className="ornate rounded-sm p-5 sm:p-8">
        <NewGameForm onSaved={() => setRefreshKey((k) => k + 1)} />
      </div>

      <RecentGames refreshKey={refreshKey} />
    </div>
  );
}
