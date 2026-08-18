"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { PlayerProfile } from "@/lib/types";
import RadialStat from "@/components/RadialStat";
import CountUp from "@/components/CountUp";
import Skeleton from "@/components/Skeleton";
import { computeBadges, BADGE_TONE_CLASS } from "@/lib/badges";
import { CrownIcon, FlameIcon, ShieldIcon, SwordsIcon } from "@/components/icons";

function formatDate(iso: string) {
  const date = new Date(iso + "Z");
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setError(false);
    fetch(`/api/players/${params.id}`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-wine font-semibold">No se pudo cargar el perfil. Comprueba tu conexión.</p>;
  }

  if (notFound || !data) {
    return <p className="text-sm opacity-60 italic">Ese aspirante no existe en los registros del reino.</p>;
  }

  const { player, stats, rivalries, games } = data;
  const ratePercent = Math.round(stats.win_rate * 100);
  const badges = computeBadges(stats);

  return (
    <div className="space-y-8">
      <Link href="/jugadores" className="text-xs font-display uppercase tracking-wide opacity-60 hover:opacity-100">
        ← Volver a Jugadores
      </Link>

      <div className="ornate rounded-sm p-5 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <RadialStat percent={ratePercent} color={player.color} size={92} strokeWidth={6}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-black text-2xl border-2"
            style={{ backgroundColor: player.color, borderColor: player.color }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        </RadialStat>
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">{player.name}</h2>
          <p className="text-sm opacity-70">
            <CountUp value={stats.wins} /> victorias de <CountUp value={stats.games_played} /> batallas ·{" "}
            {ratePercent}% de gloria
          </p>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 justify-center sm:justify-start">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`text-[10px] font-display font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${BADGE_TONE_CLASS[b.tone]}`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <SwordsIcon className="w-4 h-4 shrink-0" />
          Duelos
        </h3>
        {rivalries.length === 0 ? (
          <p className="text-sm opacity-60 italic">Todavía no se ha cruzado en partida con nadie más.</p>
        ) : (
          <div className="space-y-2">
            {rivalries.map((r) => {
              const total = r.myWins + r.theirWins || 1;
              const myShare = (r.myWins / total) * 100;
              return (
                <Link
                  key={r.id}
                  href={`/jugadores/${r.id}`}
                  className="block bg-card border-2 border-border rounded-sm p-3 hover:border-gold transition-colors"
                >
                  <div className="flex items-center justify-between text-sm font-display font-semibold mb-1.5">
                    <span>
                      Tú <span className="text-gold">{r.myWins}</span>
                    </span>
                    <span className="opacity-60 text-xs">vs {r.name}</span>
                    <span>
                      <span style={{ color: r.color }}>{r.theirWins}</span> Ellos
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden flex bg-border/30">
                    <div className="h-full bg-gold" style={{ width: `${myShare}%` }} />
                    <div className="h-full" style={{ width: `${100 - myShare}%`, backgroundColor: r.color }} />
                  </div>
                  <p className="text-[11px] opacity-50 mt-1">{r.together} partidas juntos</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
          <ShieldIcon className="w-4 h-4 shrink-0" />
          Historial
        </h3>
        {games.length === 0 ? (
          <p className="text-sm opacity-60 italic">Sin batallas registradas todavía.</p>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const won = g.winner_id === player.id;
              return (
                <li
                  key={g.id}
                  className={`bg-card border-2 rounded-sm overflow-hidden flex items-stretch gap-3 ${
                    won ? "border-gold" : "border-border"
                  }`}
                >
                  {g.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.image}
                      alt="Foto de la partida"
                      className="w-16 shrink-0 object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1 text-xs font-display opacity-80">
                      {g.players.map((p, i) => (
                        <span key={p.id} className="flex items-center gap-1">
                          {i > 0 && <span className="opacity-40">vs</span>}
                          {p.id === g.winner_id && <CrownIcon className="w-3 h-3 text-gold" />}
                          <span className={p.id === player.id ? "font-bold" : ""}>{p.name}</span>
                        </span>
                      ))}
                      {!g.counts_for_stats && (
                        <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-gold/40 text-gold opacity-80">
                          No cuenta
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-50 whitespace-nowrap italic shrink-0">
                      {formatDate(g.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {stats.current_streak >= 2 && (
        <p className="text-center text-xs font-display text-wine flex items-center justify-center gap-1.5">
          <FlameIcon className="w-4 h-4" /> en racha de {stats.current_streak} victorias
        </p>
      )}
    </div>
  );
}
