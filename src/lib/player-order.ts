import type { Player } from "@/lib/types";

/** Para elegir jugadores: primero quien más ha jugado en el último año, y por nombre en los empates. */
export function sortByRecentActivity<T extends Pick<Player, "name" | "games_last_year">>(players: T[]): T[] {
  return [...players].sort(
    (a, b) => (b.games_last_year ?? 0) - (a.games_last_year ?? 0) || a.name.localeCompare(b.name, "es")
  );
}
