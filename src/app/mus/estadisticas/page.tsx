"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MusLeaderboardEntry } from "@/lib/types";
import CountUp from "@/components/CountUp";
import HallOfFame, { HallOfFameSkeleton } from "@/components/HallOfFame";
import ActivityStats from "@/components/ActivityStats";
import AdvancedStats from "@/components/AdvancedStats";
import ProvisionalPlayers from "@/components/ProvisionalPlayers";
import { CardsIcon, LaurelIcon } from "@/components/icons";

type StatsResponse = {
  totalGames: number;
  gamesThisYear: number;
  monthly: { month: string; count: number }[];
  leaderboard: MusLeaderboardEntry[];
  provisional?: MusLeaderboardEntry[];
  minRankedGames?: number;
};

export default function MusEstadisticasPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/mus/stats")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <HallOfFameSkeleton />;

  if (error) {
    return <p className="text-sm text-wine font-semibold">No se pudo cargar la Sala de la Fama del Mus. Comprueba tu conexión.</p>;
  }

  const hasProvisional = (stats?.provisional?.length ?? 0) > 0;
  if (!stats || (stats.leaderboard.length === 0 && !hasProvisional)) {
    return (
      <HallOfFame game="mus" players={[]} subtitle="Cada envite cuenta. Tu nombre puede ser el siguiente." />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <HallOfFame
        game="mus"
        players={stats.leaderboard}
        subtitle={<><CountUp value={stats.totalGames} /> partidas selladas en la crónica.</>}
      />

      <ActivityStats totalGames={stats.totalGames} gamesThisYear={stats.gamesThisYear} monthly={stats.monthly} />

      <ProvisionalPlayers
        players={stats.provisional ?? []}
        minGames={stats.minRankedGames ?? 3}
        game="mus"
      />

      <AdvancedStats game="mus" />


      <Link
        href="/mus/wrapped"
        className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
      >
        <LaurelIcon className="w-4 h-6" />
        Resumen del año
        <LaurelIcon className="w-4 h-6" flip />
      </Link>
      <p className="text-center text-xs opacity-40 italic flex items-center justify-center gap-1.5">
        <CardsIcon className="w-3.5 h-3.5" /> que tu pareja perdure en la leyenda del Mus
      </p>
    </div>
  );
}
