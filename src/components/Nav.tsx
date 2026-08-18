"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CrestIcon } from "./icons";

const links = [
  { href: "/", label: "Nueva Partida" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/estadisticas", label: "Sala de la Fama" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="relative bg-wine text-[#f2e4bd] shadow-lg sticky top-0 z-10 border-b-4 border-gold">
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 6px)",
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="font-display text-lg sm:text-2xl font-bold tracking-wide flex items-center gap-2 shrink-0">
          <CrestIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gold-bright" />
          <span className="hidden xs:inline">Catán</span>
        </Link>
        <nav className="flex gap-1 sm:gap-2 overflow-x-auto">
          {links.map((link) => {
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
