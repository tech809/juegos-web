-- Esquema base. `game` ya está pensado para soportar más juegos en el futuro.

-- Cada juego tiene su propia lista de jugadores: un mismo nombre puede
-- existir en 'catan' y en 'mus' como dos jugadores distintos, con
-- historiales y estadísticas separados.
-- Ojo: el índice único (name, game) NO se crea aquí, sino en db.ts
-- después de la migración, porque en bases de datos antiguas la columna
-- `game` todavía no existe cuando se ejecuta este fichero.
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'catan',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL DEFAULT 'catan',
  winner_id TEXT NOT NULL REFERENCES players(id),
  winner_team INTEGER,
  image TEXT,
  counts_for_stats INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- counts_for_stats: 1 = partida "oficial" (cuenta para victorias/rachas/ranking),
-- 0 = partida amistosa que queda en la crónica pero no afecta a las estadísticas.

-- winner_team (0 o 1) se usa solo en juegos por parejas como 'mus'.
-- winner_id sigue relleno siempre (para 'mus' apunta a un jugador
-- representativo de la pareja ganadora), así el resto del esquema
-- y las consultas existentes no necesitan tratar casos NULL.

CREATE TABLE IF NOT EXISTS game_players (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id),
  team INTEGER,
  PRIMARY KEY (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Temporadas anteriores a la app: solo tenemos el resumen (partidas
-- jugadas / ganadas) por jugador y año, no el detalle de cada partida.
CREATE TABLE IF NOT EXISTS legacy_stats (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL DEFAULT 'catan',
  year INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  games_played INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  UNIQUE (game, year, player_id)
);
