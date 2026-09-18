"use client";

import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import type { GameId } from "@/lib/games";
import { gameBasePath } from "@/lib/games";
import PlayerAvatar from "@/components/PlayerAvatar";

/**
 * Jugadores con muy pocas partidas. Van aparte del ranking porque un
 * 100% con una sola victoria no es comparable con el de un veterano.
 */
export default function ProvisionalPlayers({
  players,
  minGames,
  game,
}: {
  players: LeaderboardEntry[];
  minGames: number;
  game: GameId;
}) {
  if (!players || players.length === 0) return null;
  const base = gameBasePath(game);

  return (
    <div className="space-y-2">
      <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em]">
        Aún en pruebas
      </h3>
      <p className="text-center text-[11px] opacity-50 italic -mt-1 mb-2">
        Con menos de {minGames} partidas no entran al ranking todavía.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`${base}/jugadores/${p.id}`}
            className="bg-card border-2 border-border rounded-sm px-3 py-2 flex items-center gap-2 hover:border-gold transition-colors"
          >
            <PlayerAvatar name={p.name} color={p.color} photo={p.photo} size={28} />
            <span className="min-w-0">
              <span className="font-display font-semibold text-sm block truncate">{p.name}</span>
              <span className="text-[11px] opacity-60">
                {p.games_played} {p.games_played === 1 ? "partida" : "partidas"} · {p.wins}{" "}
                {p.wins === 1 ? "victoria" : "victorias"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
