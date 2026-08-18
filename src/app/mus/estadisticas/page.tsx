"use client";

import { useEffect, useState } from "react";
import type { MusLeaderboardEntry } from "@/lib/types";
import RadialStat from "@/components/RadialStat";
import CountUp from "@/components/CountUp";
import Skeleton from "@/components/Skeleton";
import { computeBadges, BADGE_TONE_CLASS } from "@/lib/badges";
import { CardsIcon, FlameIcon } from "@/components/icons";

type StatsResponse = {
  totalGames: number;
  leaderboard: MusLeaderboardEntry[];
};

const PODIUM_STYLE = [
  { order: "sm:order-2", height: "min-h-40", medal: "🥇", ring: 84, avatar: 60 },
  { order: "sm:order-1", height: "min-h-32", medal: "🥈", ring: 68, avatar: 48 },
  { order: "sm:order-3", height: "min-h-28", medal: "🥉", ring: 60, avatar: 44 },
];

export default function MusEstadisticasPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mus/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

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

  if (!stats || stats.leaderboard.length === 0) {
    return (
      <p className="text-sm opacity-60 italic">
        Aún no hay suficientes envites para inscribir un nombre en la Sala de la Fama del Mus.
      </p>
    );
  }

  const podium = stats.leaderboard.slice(0, 3);
  const rest = stats.leaderboard.slice(3);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1">Sala de la Fama del Mus</h2>
        <p className="text-sm opacity-70 italic">
          <CountUp value={stats.totalGames} /> partidas selladas en la crónica.
        </p>
      </div>

      {/* Podio */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-3">
        {podium.map((p, i) => {
          const style = PODIUM_STYLE[i];
          const badges = computeBadges(p);
          return (
            <div
              key={p.id}
              className={`${style.order} w-full sm:w-36 flex flex-col items-center justify-end ${style.height} ornate rounded-sm bg-card px-3 py-4`}
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
            </div>
          );
        })}
      </div>

      {/* Resto del ranking */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em]">
            El resto de la mesa
          </h3>
          {rest.map((p, i) => {
            const rank = i + 4;
            return (
              <div
                key={p.id}
                className="bg-card border-2 border-border rounded-sm p-3 flex items-center gap-3"
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
                    {p.wins} victorias · {p.games_played} partidas
                    {p.current_streak >= 2 && (
                      <span className="ml-1.5 text-wine font-semibold inline-flex items-center gap-0.5">
                        <FlameIcon className="w-3 h-3" /> {p.current_streak}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs opacity-40 italic flex items-center justify-center gap-1.5">
        <CardsIcon className="w-3.5 h-3.5" /> que tu pareja perdure en la leyenda del Mus
      </p>
    </div>
  );
}
