import Link from "next/link";
import { CardsIcon, CrestIcon, LaurelIcon } from "@/components/icons";

const GAMES = [
  {
    href: "/catan",
    icon: CrestIcon,
    label: "Catán",
    tagline: "Registra tu conquista y reina en la Sala de la Fama",
  },
  {
    href: "/mus",
    icon: CardsIcon,
    label: "Mus",
    tagline: "Registra el envite y corona a la pareja vencedora",
  },
];

export default function Home() {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 mb-8">
        <LaurelIcon className="w-8 h-16 text-gold opacity-60" />
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide">
            Crónicas de la Mesa
          </h1>
          <p className="text-sm opacity-70 italic mt-2">
            Elige tu juego para registrar partidas y consultar la crónica
          </p>
        </div>
        <LaurelIcon className="w-8 h-16 text-gold opacity-60" flip />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {GAMES.map(({ href, icon: Icon, label, tagline }) => (
          <Link
            key={href}
            href={href}
            className="ornate rounded-sm bg-card p-8 flex flex-col items-center gap-3 hover:brightness-105 hover:-translate-y-0.5 transition-all"
          >
            <Icon className="w-12 h-12 text-wine" />
            <span className="font-display text-xl font-bold">{label}</span>
            <span className="text-xs opacity-70 italic">{tagline}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
