export const GAME_KEYS = ["catan", "mus"] as const;
export type GameId = (typeof GAME_KEYS)[number];

/** Convierte un valor cualquiera (query param, body…) en un juego válido. */
export function normalizeGame(value: unknown): GameId {
  return value === "mus" ? "mus" : "catan";
}

/** Prefijo de rutas de cada juego: catán vive en la raíz, mus bajo /mus. */
export function gameBasePath(game: GameId) {
  return game === "mus" ? "/mus" : "";
}
