"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CardsIcon, CheckIcon, ChevronDownIcon, CrestIcon } from "./icons";

export const GAMES = {
  catan: {
    label: "Catán",
    icon: "🌾",
    home: "/",
    links: [
      { href: "/", label: "Nueva Partida" },
      { href: "/jugadores", label: "Jugadores" },
      { href: "/estadisticas", label: "Sala de la Fama" },
    ],
  },
  mus: {
    label: "Mus",
    icon: "🃏",
    home: "/mus",
    links: [
      { href: "/mus", label: "Nueva Partida" },
      { href: "/jugadores", label: "Jugadores" },
      { href: "/mus/estadisticas", label: "Sala de la Fama" },
    ],
  },
} as const;

export type GameKey = keyof typeof GAMES;
const ORDER: GameKey[] = ["catan", "mus"];

export default function Nav() {
  const pathname = usePathname();
  const current: GameKey = pathname.startsWith("/mus") ? "mus" : "catan";
  const game = GAMES[current];
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.dataset.theme = current;
  }, [current]);

  useEffect(() => {
    setSwitcherOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="relative bg-wine text-[#f2e4bd] shadow-lg sticky top-0 z-20 border-b-4 border-gold">
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 6px)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative shrink-0" ref={switcherRef}>
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            aria-expanded={switcherOpen}
            aria-haspopup="menu"
            className="font-display text-lg sm:text-2xl font-bold tracking-wide flex items-center gap-1.5 sm:gap-2 pr-1 rounded hover:bg-white/5 transition-colors"
          >
            {current === "mus" ? (
              <CardsIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gold-bright" />
            ) : (
              <CrestIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gold-bright" />
            )}
            <span>{game.label}</span>
            <ChevronDownIcon
              className={`w-4 h-4 sm:w-5 sm:h-5 text-gold-bright/80 transition-transform ${switcherOpen ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                role="menu"
                className="ornate absolute top-full left-0 mt-3 w-60 bg-card text-foreground rounded-sm overflow-hidden z-30 py-1.5"
              >
                <p className="px-3 pt-1.5 pb-2 text-[10px] font-display uppercase tracking-[0.2em] opacity-50">
                  Cambiar de juego
                </p>
                {ORDER.map((key) => {
                  const g = GAMES[key];
                  const active = key === current;
                  return (
                    <Link
                      key={key}
                      href={g.home}
                      role="menuitem"
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-display font-semibold transition-colors ${
                        active ? "bg-gold/15 text-wine" : "hover:bg-gold/10"
                      }`}
                    >
                      <span className="text-xl leading-none" aria-hidden>
                        {g.icon}
                      </span>
                      <span className="flex-1">{g.label}</span>
                      {active && <CheckIcon className="w-4 h-4 text-gold shrink-0" />}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex gap-1 sm:gap-2 overflow-x-auto">
          {game.links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 rounded text-xs sm:text-sm font-display font-semibold tracking-wide uppercase whitespace-nowrap transition-all border ${
                  active
                    ? "bg-gold-bright text-wine border-gold-bright shadow-sm"
                    : "text-[#f2e4bd]/85 border-transparent hover:border-gold-bright/50 hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
