"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import CountUp from "@/components/CountUp";
import HallOfFame, { HallOfFameSkeleton } from "@/components/HallOfFame";
import ActivityStats from "@/components/ActivityStats";
import AdvancedStats from "@/components/AdvancedStats";
import ProvisionalPlayers from "@/components/ProvisionalPlayers";
import { LaurelIcon, ScrollIcon, ShieldIcon } from "@/components/icons";

type StatsResponse = {
  mode: "live" | "legacy" | "historico";
  year: number | null;
  totalGames: number | null;
  gamesThisYear: number | null;
  monthly: { month: string; count: number }[];
  leaderboard: LeaderboardEntry[];
  provisional?: LeaderboardEntry[];
  minRankedGames?: number;
};

export default function EstadisticasPage() {
  const [years, setYears] = useState<number[] | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | "all" | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/stats/years")
      .then((r) => r.json())
      .then((d) => setYears(d.years))
      .catch(() => setYears([]));
  }, []);

  useEffect(() => {
    const url = selectedYear === null ? "/api/stats" : `/api/stats?year=${selectedYear}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const activeYear = selectedYear === "all" ? "all" : selectedYear ?? stats?.year ?? null;

  function selectYear(year: number | "all") {
    if (year === activeYear) return;
    setLoading(true);
    setError(false);
    setSelectedYear(year);
  }

  const yearPills = years && years.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => selectYear(y)}
          aria-pressed={activeYear === y}
          className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold tracking-wide border-2 transition-all ${
            activeYear === y
              ? "bg-gold-bright border-gold-bright text-wine"
              : "border-border opacity-70 hover:opacity-100 hover:border-gold"
          }`}
        >
          {y}
        </button>
      ))}
      <button
        type="button"
        onClick={() => selectYear("all")}
        aria-pressed={activeYear === "all"}
        className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold tracking-wide border-2 transition-all flex items-center gap-1.5 ${
          activeYear === "all"
            ? "bg-gold-bright border-gold-bright text-wine"
            : "border-border opacity-70 hover:opacity-100 hover:border-gold"
        }`}
      >
        <ScrollIcon className="w-3 h-3" />
        Histórico
      </button>
    </div>
  );

  if (loading) return <HallOfFameSkeleton />;

  if (error) {
    return <p className="text-sm text-wine font-semibold">No se pudo cargar la Sala de la Fama. Comprueba tu conexión.</p>;
  }

  const hasProvisional = (stats?.provisional?.length ?? 0) > 0;
  if (!stats || (stats.leaderboard.length === 0 && !hasProvisional)) {
    return (
      <HallOfFame game="catan" players={[]} filters={yearPills} subtitle="Cada batalla cuenta. Tu nombre puede ser el siguiente." />
    );
  }

  const subtitle =
    stats.mode === "live"
      ? <>
          <CountUp value={stats.totalGames ?? 0} /> batallas selladas en la crónica de {stats.year}.
        </>
      : stats.mode === "legacy"
        ? `Temporada ${stats.year} — importada de tu registro anterior a la app.`
        : "Todas las temporadas combinadas, de siempre hasta hoy.";

  return (
    <div className="space-y-6 sm:space-y-8">
      <HallOfFame game="catan" players={stats.leaderboard} subtitle={subtitle} filters={yearPills} />

      {stats.mode === "live" && stats.totalGames !== null && stats.gamesThisYear !== null && (
        <ActivityStats totalGames={stats.totalGames} gamesThisYear={stats.gamesThisYear} monthly={stats.monthly} />
      )}

      {/* Las estadísticas avanzadas necesitan el detalle de cada partida, que
          solo existe para las registradas en la app: no aplican a las
          temporadas importadas (mode "legacy"). */}
      <ProvisionalPlayers
        players={stats.provisional ?? []}
        minGames={stats.minRankedGames ?? 3}
        game="catan"
      />

      {stats.mode !== "legacy" && <AdvancedStats game="catan" />}


      <Link
        href="/wrapped"
        className="seal-btn w-full py-3 rounded bg-wine text-[#f6e9c8] text-base hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
      >
        <LaurelIcon className="w-4 h-6" />
        Resumen del año
        <LaurelIcon className="w-4 h-6" flip />
      </Link>
      <p className="text-center text-xs opacity-40 italic flex items-center justify-center gap-1.5">
        <ShieldIcon className="w-3.5 h-3.5" /> que tu nombre perdure en la leyenda de Catán
      </p>
    </div>
  );
}
