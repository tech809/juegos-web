"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isMus = pathname.startsWith("/mus");
  const isCatan = pathname.startsWith("/catan") || pathname.startsWith("/jugadores");

  return (
    <footer className="text-center text-xs opacity-50 py-6 font-display tracking-wide">
      {isMus
        ? "🃏 MUS · CRÓNICAS DE LA MESA 🃏"
        : isCatan
          ? "⚔ CATÁN · CRÓNICAS DE LA MESA ⚔"
          : "⚜ CRÓNICAS DE LA MESA ⚜"}
    </footer>
  );
}
