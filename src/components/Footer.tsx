"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isMus = pathname.startsWith("/mus");

  return (
    <footer className="text-center text-xs opacity-50 py-6 font-display tracking-wide">
      {isMus ? "🃏 MUS · CRÓNICAS DE LA MESA 🃏" : "⚔ CATÁN · CRÓNICAS DE LA MESA ⚔"}
      <span className="block mt-2 text-[10px] normal-case tracking-normal">
        <a href="/audio-credits.txt" className="underline underline-offset-2">Créditos del sonido</a>
      </span>
    </footer>
  );
}
