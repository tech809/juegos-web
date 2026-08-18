-- Esquema base. `game` ya está pensado para soportar más juegos en el futuro.

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
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
