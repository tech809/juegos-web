"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { WrappedData } from "@/lib/types";
import type { GameId } from "@/lib/games";
import { gameBasePath } from "@/lib/games";
import CountUp from "./CountUp";
import RadialStat from "./RadialStat";
import Skeleton from "./Skeleton";
import {
  AllianceIcon,
  CalendarIcon,
  CameraIcon,
  CardsIcon,
  CrestIcon,
  CrownIcon,
  FlameIcon,
  LaurelIcon,
  ShareIcon,
} from "./icons";

const MEDALS = ["🥇", "🥈", "🥉"];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function formatDate(raw: string) {
  const date = new Date(`${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 64 : -64, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64, scale: 0.97 }),
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] sm:text-[11px] font-display font-semibold uppercase tracking-[0.25em] text-gold">
      {children}
    </p>
  );
}

function Avatar({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-[#f6e9c8] font-display font-black border-2"
      style={{
        backgroundColor: color,
        borderColor: color,
        width: size,
        height: size,
        fontSize: size / 2.4,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function WrappedView({ game }: { game: GameId }) {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [shared, setShared] = useState(false);

  const label = game === "mus" ? "Mus" : "Catán";

  useEffect(() => {
    let cancelled = false;
    const url =
      selectedYear === null
        ? `/api/wrapped?game=${game}`
        : `/api/wrapped?game=${game}&year=${selectedYear}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d: WrappedData) => {
        if (cancelled) return;
        setData(d);
        setIndex(0);
        setDir(1);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game, selectedYear]);

  const cards = useMemo(() => {
    if (!data) return [] as { key: string; node: React.ReactNode }[];
    const list: { key: string; node: React.ReactNode }[] = [];

    if (data.mode === "empty") {
      list.push({
        key: "empty",
        node: (
          <>
            <Kicker>Resumen de {data.year}</Kicker>
            <h2 className="font-display text-3xl sm:text-4xl font-black">Página en blanco</h2>
            <p className="text-sm opacity-70 italic max-w-xs">
              Todavía no hay ninguna partida de {label} registrada en {data.year}. Registra la
              primera y esta crónica empezará a escribirse sola.
            </p>
            <Link
              href={gameBasePath(game) || "/"}
              className="seal-btn inline-flex items-center gap-2 px-5 py-2.5 rounded bg-wine text-[#f6e9c8] hover:brightness-110 transition-all text-sm mt-1"
            >
              Registrar partida
            </Link>
          </>
        ),
      });
      return list;
    }

    /* Portada */
    list.push({
      key: "cover",
      node: (
        <>
          {game === "mus" ? (
            <CardsIcon className="w-10 h-10 text-gold" />
          ) : (
            <CrestIcon className="w-12 h-12 text-gold" />
          )}
          <Kicker>Tu año en {label}</Kicker>
          <h2 className="font-display text-6xl sm:text-7xl font-black text-gold leading-none">
            {data.year}
          </h2>
          {data.totalGames !== null ? (
            <p className="text-sm opacity-80">
              <span className="font-display font-bold text-2xl text-wine align-middle">
                <CountUp value={data.totalGames} />
              </span>{" "}
              {data.totalGames === 1 ? "partida sellada" : "partidas selladas"} en la crónica
            </p>
          ) : (
            <p className="text-sm opacity-70 italic">Una temporada más para la historia.</p>
          )}
          {data.mode === "legacy" && (
            <p className="text-[11px] opacity-55 italic max-w-xs">
              Temporada importada: solo se conservan los totales de cada jugador.
            </p>
          )}
          <p className="text-[11px] opacity-50 italic mt-1">Desliza para ver el resumen →</p>
        </>
      ),
    });

    // con dos o tres partidas cualquier corona es circunstancial: se dice
    const scarce = data.mode === "live" && (data.totalGames ?? 0) < 3;

    /* Campeón */
    if (data.champion) {
      const c = data.champion;
      list.push({
        key: "champion",
        node: (
          <>
            <Kicker>{game === "mus" ? "Manos de oro" : "Campeón de la temporada"}</Kicker>
            <div className="relative flex items-center justify-center gap-1">
              <LaurelIcon className="w-6 h-16 text-gold opacity-70" />
              <RadialStat
                percent={Math.round(c.win_rate * 100)}
                color={c.player.color}
                size={110}
                strokeWidth={6}
              >
                <Avatar name={c.player.name} color={c.player.color} size={80} />
              </RadialStat>
              <LaurelIcon className="w-6 h-16 text-gold opacity-70" flip />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-black flex items-center gap-2">
              <CrownIcon className="w-6 h-6 text-gold" />
              {c.player.name}
            </h2>
            <p className="text-sm opacity-80">
              <span className="font-display font-bold text-xl">
                <CountUp value={c.wins} />
              </span>{" "}
              {c.wins === 1 ? "victoria" : "victorias"} en {c.games_played}{" "}
              {c.games_played === 1 ? "partida" : "partidas"} ·{" "}
              {Math.round(c.win_rate * 100)}%
            </p>
            {scarce && (
              <p className="text-[11px] opacity-55 italic max-w-xs">
                Con tan pocas partidas en el año, la corona pesa poco: hay temporada por delante.
              </p>
            )}
          </>
        ),
      });
    }

    /* Podio */
    if (data.podium.length >= 2 && !scarce) {
      list.push({
        key: "podium",
        node: (
          <>
            <Kicker>El podio de {data.year}</Kicker>
            <ul className="w-full max-w-xs space-y-2 mt-1">
              {data.podium.map((e, i) => (
                <li
                  key={e.player.id}
                  className="bg-parchment-deep border-2 border-border rounded-sm px-3 py-2 flex items-center gap-3"
                >
                  <span className="text-xl" aria-hidden>
                    {MEDALS[i]}
                  </span>
                  <Avatar name={e.player.name} color={e.player.color} size={32} />
                  <span className="font-display font-bold truncate flex-1 text-left">
                    {e.player.name}
                  </span>
                  <span className="text-sm font-display font-bold whitespace-nowrap">
                    {e.wins} <span className="opacity-60 font-normal text-xs">vict.</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ),
      });
    }

    /* Racha */
    if (data.longestStreak) {
      const s = data.longestStreak;
      list.push({
        key: "streak",
        node: (
          <>
            <Kicker>La racha del año</Kicker>
            <FlameIcon className="w-12 h-12 text-wine animate-shimmer" />
            <p className="font-display text-6xl font-black text-wine leading-none">
              <CountUp value={s.length} />
            </p>
            <h2 className="font-display text-2xl font-bold">{s.player.name}</h2>
            <p className="text-sm opacity-75 max-w-xs">
              encadenó {s.length} victorias seguidas sin ceder el trono.
            </p>
          </>
        ),
      });
    }

    /* Mejor pareja (mus) */
    if (data.bestPair) {
      const p = data.bestPair;
      list.push({
        key: "pair",
        node: (
          <>
            <Kicker>La pareja del año</Kicker>
            <div className="flex items-center gap-2">
              <Avatar name={p.a.name} color={p.a.color} size={56} />
              <AllianceIcon className="w-6 h-6 text-gold" />
              <Avatar name={p.b.name} color={p.b.color} size={56} />
            </div>
            <h2 className="font-display text-2xl font-bold">
              {p.a.name} y {p.b.name}
            </h2>
            <p className="text-sm opacity-80">
              {p.wins} {p.wins === 1 ? "victoria" : "victorias"} en {p.together}{" "}
              {p.together === 1 ? "partida juntos" : "partidas juntos"} ·{" "}
              {Math.round(p.win_rate * 100)}%
            </p>
            {p.provisional && (
              <p className="text-[11px] opacity-55 italic max-w-xs">
                Con tan pocas manos juntos, más que leyenda todavía es una promesa.
              </p>
            )}
          </>
        ),
      });
    }

    /* Mes más movido */
    if (data.busiestMonth) {
      const m = data.busiestMonth;
      list.push({
        key: "month",
        node: (
          <>
            <Kicker>El mes más movido</Kicker>
            <CalendarIcon className="w-10 h-10 text-gold" />
            <h2 className="font-display text-3xl font-black capitalize">{monthLabel(m.month)}</h2>
            <p className="text-sm opacity-80">
              <span className="font-display font-bold text-xl">
                <CountUp value={m.games} />
              </span>{" "}
              {m.games === 1 ? "partida" : "partidas"} en un solo mes
            </p>
          </>
        ),
      });
    }

    /* Foto */
    if (data.photo) {
      const ph = data.photo;
      list.push({
        key: "photo",
        node: (
          <>
            <Kicker>La última foto del año</Kicker>
            <div className="w-full max-w-xs rounded-sm overflow-hidden border-2 border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ph.image}
                alt={`Partida del ${formatDate(ph.created_at)}`}
                className="w-full h-48 sm:h-56 object-cover"
              />
            </div>
            <p className="text-sm opacity-80 flex items-center gap-1.5">
              <CameraIcon className="w-4 h-4 text-gold" />
              {formatDate(ph.created_at)}
              {ph.winner ? ` · ganó ${ph.winner}` : ""}
            </p>
          </>
        ),
      });
    }

    /* Cierre */
    list.push({
      key: "outro",
      node: (
        <>
          <Kicker>Y hasta aquí {data.year}</Kicker>
          <div className="flex items-end justify-center gap-6 mt-1">
            {data.totalGames !== null && (
              <div>
                <p className="text-4xl font-display font-black text-gold">
                  <CountUp value={data.totalGames} />
                </p>
                <p className="text-[11px] opacity-60">partidas</p>
              </div>
            )}
            <div>
              <p className="text-4xl font-display font-black">
                <CountUp value={data.totalPlayers} />
              </p>
              <p className="text-[11px] opacity-60">
                {data.totalPlayers === 1 ? "jugador" : "jugadores"}
              </p>
            </div>
            {data.friendlyGames > 0 && (
              <div>
                <p className="text-4xl font-display font-black text-wine">
                  <CountUp value={data.friendlyGames} />
                </p>
                <p className="text-[11px] opacity-60">amistosas</p>
              </div>
            )}
          </div>
          {data.mode === "live" && data.firstGame && data.lastGame && (
            <p className="text-xs opacity-60 italic mt-1">
              De {formatDate(data.firstGame)} a {formatDate(data.lastGame)}.
            </p>
          )}
          <p className="text-sm opacity-75 italic max-w-xs mt-1">
            Que el año que viene traiga mejores manos, peores rivales y más batallas dignas de la
            crónica.
          </p>
          <Link
            href={`${gameBasePath(game)}/estadisticas`}
            className="seal-btn inline-flex items-center gap-2 px-5 py-2.5 rounded bg-wine text-[#f6e9c8] hover:brightness-110 transition-all text-sm mt-1"
          >
            Ver la Sala de la Fama
          </Link>
        </>
      ),
    });

    return list;
  }, [data, game, label]);

  const total = cards.length;

  const paginate = useCallback(
    (delta: number) => {
      setDir(delta);
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
    },
    [total]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "ArrowLeft") paginate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paginate]);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `Mi resumen de ${label} en ${data?.year ?? ""}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: text, text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // el usuario canceló el diálogo de compartir: no hay nada que hacer
    }
  }

  const yearPills = data && data.years.length > 0 && (
    <div className="flex flex-wrap justify-center gap-2 mb-5">
      {data.years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => {
            if (data.year === y) return;
            setLoading(true);
            setError(false);
            setSelectedYear(y);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold tracking-wide border-2 transition-all ${
            data.year === y
              ? "bg-gold-bright border-gold-bright text-wine"
              : "border-border opacity-70 hover:opacity-100 hover:border-gold"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56 mx-auto" />
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-[360px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-wine font-semibold text-center">
        No se pudo cargar el resumen del año. Comprueba tu conexión.
      </p>
    );
  }

  const current = cards[Math.min(index, total - 1)];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1">Resumen del Año</h2>
        <p className="text-sm opacity-70 italic mb-4">
          Tu temporada de {label}, carta a carta.
        </p>
        {yearPills}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`${data.year}-${current.key}`}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60 && index < total - 1) paginate(1);
              else if (info.offset.x > 60 && index > 0) paginate(-1);
            }}
            className="ornate rounded-sm bg-card px-5 py-8 min-h-[380px] flex flex-col items-center justify-center text-center gap-3 select-none cursor-grab active:cursor-grabbing"
          >
            {current.node}
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => paginate(-1)}
            disabled={index === 0}
            aria-label="Tarjeta anterior"
            className="px-3 py-2 rounded border-2 border-border text-xs font-display font-semibold uppercase tracking-wide disabled:opacity-30 hover:border-gold transition-colors"
          >
            Antes
          </button>

          <div className="flex items-center gap-1.5">
            {cards.map((c, i) => (
              <button
                key={c.key}
                type="button"
                aria-label={`Ir a la tarjeta ${i + 1}`}
                onClick={() => {
                  setDir(i >= index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-5 bg-gold" : "w-2 bg-border opacity-60 hover:opacity-100"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => paginate(1)}
            disabled={index >= total - 1}
            aria-label="Tarjeta siguiente"
            className="px-3 py-2 rounded border-2 border-border text-xs font-display font-semibold uppercase tracking-wide disabled:opacity-30 hover:border-gold transition-colors"
          >
            Después
          </button>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 text-xs font-display font-semibold uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity"
        >
          <ShareIcon className="w-4 h-4" />
          {shared ? "Enlace copiado" : "Compartir"}
        </button>
      </div>
    </div>
  );
}
