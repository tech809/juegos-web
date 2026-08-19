"use client";

import { useEffect, useState } from "react";
import type { AdvancedStats as AdvancedStatsData, StatPlayerRef } from "@/lib/types";
import type { GameId } from "@/lib/games";
import { gameBasePath } from "@/lib/games";
import Link from "next/link";
import Skeleton from "./Skeleton";
import {
  AllianceIcon,
  CalendarIcon,
  CrownIcon,
  FlameIcon,
  ScrollIcon,
  SwordsIcon,
} from "./icons";

const WEEKDAYS = [
  "los domingos",
  "los lunes",
  "los martes",
  "los miércoles",
  "los jueves",
  "los viernes",
  "los sábados",
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function PlayerChip({ player, game }: { player: StatPlayerRef; game: GameId }) {
  return (
    <Link
      href={`${gameBasePath(game)}/jugadores/${player.id}`}
      className="inline-flex items-center gap-1.5 align-middle hover:brightness-110"
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-[#f6e9c8] font-display font-bold shrink-0"
        style={{ backgroundColor: player.color }}
        aria-hidden
      >
        {player.name.charAt(0).toUpperCase()}
      </span>
      <span className="font-display font-bold">{player.name}</span>
    </Link>
  );
}

function StatCard({
  icon,
  kicker,
  children,
  note,
}: {
  icon: React.ReactNode;
  kicker: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="bg-parchment-deep border-2 border-border rounded-sm p-3 flex flex-col gap-1.5">
      <p className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-gold flex items-center gap-1.5">
        <span className="shrink-0">{icon}</span>
        {kicker}
      </p>
      <div className="text-sm leading-snug">{children}</div>
      {note && <p className="text-[11px] opacity-60 italic">{note}</p>}
    </div>
  );
}

export default function AdvancedStats({ game }: { game: GameId }) {
  const [data, setData] = useState<AdvancedStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stats/advanced?game=${game}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: AdvancedStatsData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  if (loading) return <Skeleton className="h-44 w-full" />;

  // sin partidas registradas en la app no hay nada honesto que contar
  if (!data || data.totalGames === 0) return null;

  const cards: React.ReactNode[] = [];

  if (data.bestPair) {
    const p = data.bestPair;
    cards.push(
      <StatCard
        key="pair"
        icon={<AllianceIcon className="w-3.5 h-3.5" />}
        kicker="Mejor pareja"
        note={
          p.provisional
            ? `Solo han jugado ${p.together} ${p.together === 1 ? "partida" : "partidas"} juntos: aún es pronto para coronarlos.`
            : `${p.wins} de ${p.together} partidas juntos · ${pct(p.win_rate)}`
        }
      >
        <PlayerChip player={p.a} game={game} /> <span className="opacity-60">y</span>{" "}
        <PlayerChip player={p.b} game={game} />
        {!p.provisional && (
          <span className="opacity-70">
            {" "}
            — {p.wins} {p.wins === 1 ? "victoria" : "victorias"} codo con codo
          </span>
        )}
      </StatCard>
    );
  }

  if (data.topRivalry) {
    const r = data.topRivalry;
    cards.push(
      <StatCard
        key="rivalry"
        icon={<SwordsIcon className="w-3.5 h-3.5" />}
        kicker="Rivalidad más desequilibrada"
        note={
          r.provisional
            ? `Con solo ${r.duels} duelos decididos, la revancha sigue abierta.`
            : `${pct(r.win_rate)} de los duelos decididos entre ambos.`
        }
      >
        <PlayerChip player={r.winner} game={game} />{" "}
        <span className="opacity-80">
          ha ganado {r.winner_wins} de {r.duels} a
        </span>{" "}
        <PlayerChip player={r.loser} game={game} />
      </StatCard>
    );
  }

  if (data.longestStreak) {
    const s = data.longestStreak;
    cards.push(
      <StatCard
        key="streak"
        icon={<FlameIcon className="w-3.5 h-3.5" />}
        kicker="Racha histórica"
        note={s.ongoing ? "Y sigue viva ahora mismo." : "La mayor racha registrada en la app."}
      >
        <PlayerChip player={s.player} game={game} />{" "}
        <span className="opacity-80">
          encadenó <span className="font-display font-bold text-wine">{s.length}</span> victorias
          seguidas
        </span>
      </StatCard>
    );
  }

  if (data.bestMonth) {
    const m = data.bestMonth;
    cards.push(
      <StatCard
        key="month"
        icon={<CalendarIcon className="w-3.5 h-3.5" />}
        kicker="Mes más movido"
        note={
          m.top ? (
            <>
              El más en forma: {m.top.player.name} ({m.top.wins}{" "}
              {m.top.wins === 1 ? "victoria" : "victorias"} en {m.top.games_played})
            </>
          ) : undefined
        }
      >
        <span className="font-display font-bold capitalize">{monthLabel(m.month)}</span>{" "}
        <span className="opacity-80">
          — {m.games} {m.games === 1 ? "partida" : "partidas"}
        </span>
      </StatCard>
    );
  }

  if (data.mostActive) {
    const a = data.mostActive;
    cards.push(
      <StatCard
        key="active"
        icon={<CrownIcon className="w-3.5 h-3.5" />}
        kicker="Quien más se sienta a la mesa"
        note={`${a.wins} ${a.wins === 1 ? "victoria" : "victorias"} · ${pct(a.win_rate)} de acierto`}
      >
        <PlayerChip player={a.player} game={game} />{" "}
        <span className="opacity-80">
          ha jugado <span className="font-display font-bold">{a.games_played}</span>{" "}
          {a.games_played === 1 ? "partida" : "partidas"}
        </span>
      </StatCard>
    );
  }

  if (data.frequentRivalry) {
    const f = data.frequentRivalry;
    cards.push(
      <StatCard
        key="frequent"
        icon={<SwordsIcon className="w-3.5 h-3.5" />}
        kicker="El duelo más repetido"
        note={`Se han cruzado ${f.duels} veces (${f.a_wins}–${f.b_wins}).`}
      >
        <PlayerChip player={f.a} game={game} /> <span className="opacity-60">contra</span>{" "}
        <PlayerChip player={f.b} game={game} />
      </StatCard>
    );
  }

  if (data.favoriteWeekday) {
    const w = data.favoriteWeekday;
    cards.push(
      <StatCard
        key="weekday"
        icon={<CalendarIcon className="w-3.5 h-3.5" />}
        kicker="Día favorito"
        note={`${w.games} de ${data.totalGames} partidas (${pct(w.share)}).`}
      >
        <span className="opacity-80">La mesa se llena sobre todo</span>{" "}
        <span className="font-display font-bold">{WEEKDAYS[w.weekday]}</span>
      </StatCard>
    );
  }

  return (
    <div className="ornate rounded-sm bg-card p-4 sm:p-5">
      <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <ScrollIcon className="w-4 h-4 shrink-0" />
        Anales del reino
      </h3>

      {cards.length === 0 ? (
        <p className="text-sm opacity-60 italic text-center py-2">
          Con {data.totalGames} {data.totalGames === 1 ? "partida" : "partidas"} todavía no da para
          titulares. Jugad unas cuantas más y aquí aparecerán rachas, rivalidades y leyendas.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{cards}</div>
      )}

      {data.nemeses.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-display font-semibold uppercase tracking-[0.18em] text-gold mb-2">
            Bestias negras
          </p>
          <ul className="space-y-1.5">
            {data.nemeses.map((n) => (
              <li key={`${n.player.id}-${n.rival.id}`} className="text-sm flex flex-wrap items-center gap-1.5">
                <PlayerChip player={n.player} game={game} />
                <span className="opacity-70">no puede con</span>
                <PlayerChip player={n.rival} game={game} />
                <span className="text-[11px] opacity-60">
                  ({n.wins}–{n.losses} en {n.duels} duelos)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] opacity-50 italic mt-4">
        Calculado solo con las partidas oficiales registradas en la app
        {game === "catan" ? " (las temporadas importadas no guardan el detalle de cada partida)" : ""}.
      </p>
    </div>
  );
}
