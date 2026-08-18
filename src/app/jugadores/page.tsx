"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Player } from "@/lib/types";
import RadialStat from "@/components/RadialStat";
import Skeleton from "@/components/Skeleton";
import { computeBadges, BADGE_TONE_CLASS } from "@/lib/badges";
import { ShieldIcon } from "@/components/icons";

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
        <ShieldIcon className="w-6 h-6 text-wine" />
        Jugadores
      </h2>
      <p className="text-sm opacity-70 italic mb-6">Todos los que han cruzado espadas en la mesa.</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <p className="text-sm opacity-60 italic">Aún no hay aspirantes registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {players.map((p) => {
            const games = p.games_played ?? 0;
            const wins = p.wins ?? 0;
            const rate = games > 0 ? Math.round((wins / games) * 100) : 0;
            const badges = computeBadges({ games_played: games, wins });
            return (
              <Link
                href={`/jugadores/${p.id}`}
                key={p.id}
                className="ornate rounded-sm p-4 flex items-center gap-4 hover:brightness-105 transition-all"
              >
                <RadialStat percent={rate} color={p.color} size={56}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-bold text-sm border-2"
                    style={{ backgroundColor: p.color, borderColor: p.color }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                </RadialStat>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg truncate">{p.name}</p>
                  <p className="text-xs opacity-70">
                    {games} {games === 1 ? "batalla" : "batallas"} · {wins} {wins === 1 ? "victoria" : "victorias"}
                  </p>
                  <p className="text-xs font-display font-semibold mb-1" style={{ color: p.color }}>
                    {rate}% de gloria
                  </p>
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {badges.slice(0, 2).map((b) => (
                        <span
                          key={b.label}
                          className={`text-[9px] font-display font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${BADGE_TONE_CLASS[b.tone]}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
