"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import RadialStat from "@/components/RadialStat";
import CountUp from "@/components/CountUp";
import Skeleton from "@/components/Skeleton";
import ActivityStats from "@/components/ActivityStats";
import AdvancedStats from "@/components/AdvancedStats";
import ProvisionalPlayers from "@/components/ProvisionalPlayers";
import { computeBadges, BADGE_TONE_CLASS } from "@/lib/badges";
import { FlameIcon, LaurelIcon, ScrollIcon, ShieldIcon } from "@/components/icons";

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

const PODIUM_STYLE = [
  { order: "sm:order-2", height: "min-h-40", medal: "🥇", ring: 84, avatar: 60 },
  { order: "sm:order-1", height: "min-h-32", medal: "🥈", ring: 68, avatar: 48 },
  { order: "sm:order-3", height: "min-h-28", medal: "🥉", ring: 60, avatar: 44 },
];

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
    setLoading(true);
    setError(false);
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

  const yearPills = years && years.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2 mb-6">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => setSelectedYear(y)}
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
        onClick={() => setSelectedYear("all")}
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

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64 mx-auto" />
        <div className="flex justify-center items-end gap-3">
          <Skeleton className="h-32 w-24" />
          <Skeleton className="h-40 w-24" />
          <Skeleton className="h-28 w-24" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-wine font-semibold">No se pudo cargar la Sala de la Fama. Comprueba tu conexión.</p>;
  }

  const hasProvisional = (stats?.provisional?.length ?? 0) > 0;
  if (!stats || (stats.leaderboard.length === 0 && !hasProvisional)) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Sala de la Fama</h2>
          {yearPills}
        </div>
        <p className="text-sm opacity-60 italic text-center">
          Aún no hay suficientes batallas para inscribir un nombre en la Sala de la Fama.
        </p>
      </div>
    );
  }

  const podium = stats.leaderboard.slice(0, 3);
  const rest = stats.leaderboard.slice(3);

  const subtitle =
    stats.mode === "live"
      ? <>
          <CountUp value={stats.totalGames ?? 0} /> batallas selladas en la crónica de {stats.year}.
        </>
      : stats.mode === "legacy"
        ? `Temporada ${stats.year} — importada de tu registro anterior a la app.`
        : "Todas las temporadas combinadas, de siempre hasta hoy.";

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Sala de la Fama</h2>
        {yearPills}
        <p className="text-sm opacity-70 italic">{subtitle}</p>
      </div>

      {/* Podio */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-3">
        {podium.map((p, i) => {
          const style = PODIUM_STYLE[i];
          const badges = computeBadges(p);
          return (
            <Link
              href={`/jugadores/${p.id}`}
              key={p.id}
              className={`${style.order} w-full sm:w-36 flex flex-col items-center justify-end ${style.height} ornate rounded-sm bg-card px-3 py-4 hover:brightness-105 transition-all`}
            >
              <span className="text-2xl mb-1">{style.medal}</span>
              <RadialStat percent={Math.round(p.win_rate * 100)} color={p.color} size={style.ring} strokeWidth={5}>
                <div
                  className="rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-black border-2"
                  style={{
                    backgroundColor: p.color,
                    borderColor: p.color,
                    width: style.avatar,
                    height: style.avatar,
                    fontSize: style.avatar / 2.4,
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              </RadialStat>
              <p className="font-display font-bold text-sm mt-2 truncate max-w-full">{p.name}</p>
              <p className="text-[11px] opacity-70">
                <CountUp value={p.wins} /> victorias · {Math.round(p.win_rate * 100)}%
              </p>
              {p.current_streak >= 2 && (
                <p className="text-[10px] font-display font-semibold text-wine flex items-center gap-1 mt-0.5">
                  <FlameIcon className="w-3 h-3" /> racha {p.current_streak}
                </p>
              )}
              {badges.length > 0 && (
                <span
                  className={`text-[8px] font-display font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border mt-1 ${BADGE_TONE_CLASS[badges[0].tone]}`}
                >
                  {badges[0].label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Resto del ranking */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em]">
            El resto de la corte
          </h3>
          {rest.map((p, i) => {
            const rank = i + 4;
            return (
              <Link
                href={`/jugadores/${p.id}`}
                key={p.id}
                className="bg-card border-2 border-border rounded-sm p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 border-2 border-iron opacity-70">
                  {rank}
                </div>
                <RadialStat percent={Math.round(p.win_rate * 100)} color={p.color} size={44} strokeWidth={4}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold text-xs"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                </RadialStat>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-display font-semibold truncate">{p.name}</p>
                    <p className="text-sm font-display font-bold whitespace-nowrap">
                      {Math.round(p.win_rate * 100)}%
                    </p>
                  </div>
                  <p className="text-xs opacity-60">
                    {p.wins} victorias · {p.games_played} batallas
                    {p.current_streak >= 2 && (
                      <span className="ml-1.5 text-wine font-semibold inline-flex items-center gap-0.5">
                        <FlameIcon className="w-3 h-3" /> {p.current_streak}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {stats.mode === "live" && stats.totalGames !== null && stats.gamesThisYear !== null && (
        <ActivityStats totalGames={stats.totalGames} gamesThisYear={stats.gamesThisYear} monthly={stats.monthly} />
      )}

      {/* Las estadísticas avanzadas necesitan el detalle de cada partida, que
          solo existe para las registradas en la app: no aplican a las
          temporadas importadas (mode "legacy"). */}
      <ProvisionalPlayers
        players={stats.provisional ?? []}
        minGames={stats.minRankedGames ?? 4}
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
