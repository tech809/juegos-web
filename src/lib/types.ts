export type Player = {
  id: string;
  name: string;
  color: string;
  games_played?: number;
  wins?: number;
};

export type GameRecord = {
  id: string;
  winner_id: string;
  winner_name: string;
  winner_color: string;
  image?: string | null;
  counts_for_stats: boolean;
  created_at: string;
  players: { id: string; name: string; color: string }[];
};

export type LeaderboardEntry = Player & {
  games_played: number;
  wins: number;
  win_rate: number;
  current_streak: number;
  best_streak: number;
};

export type Rivalry = {
  id: string;
  name: string;
  color: string;
  together: number;
  myWins: number;
  theirWins: number;
};

export type MusTeam = { players: { id: string; name: string; color: string }[] };

export type MusGameRecord = {
  id: string;
  winner_team: 0 | 1;
  image?: string | null;
  counts_for_stats: boolean;
  created_at: string;
  teams: [MusTeam, MusTeam];
};

export type MusLeaderboardEntry = Player & {
  games_played: number;
  wins: number;
  win_rate: number;
  current_streak: number;
  best_streak: number;
};

/** Jugador tal y como se pinta en la galería o en la tarjeta para compartir. */
export type GamePhotoPlayer = { id: string; name: string; color: string };

/** Una partida con foto, ya resuelta a ganadores/rivales según el juego. */
export type GamePhoto = {
  id: string;
  game: "catan" | "mus";
  image: string;
  created_at: string;
  counts_for_stats: boolean;
  /** En catán, 1 jugador; en mus, los 2 de la pareja ganadora. */
  winners: GamePhotoPlayer[];
  rivals: GamePhotoPlayer[];
};

export type PhotosResponse = {
  total: number;
  limit: number;
  offset: number;
  photos: GamePhoto[];
};

/* --- Estadísticas avanzadas (Sala de la Fama) y resumen anual (Wrapped) --- */

export type StatPlayerRef = { id: string; name: string; color: string };

/** Pareja del mismo equipo (solo mus). `provisional` = todavía con pocas manos juntos. */
export type AdvancedPairStat = {
  a: StatPlayerRef;
  b: StatPlayerRef;
  together: number;
  wins: number;
  win_rate: number;
  provisional: boolean;
};

/** Rivalidad más desequilibrada: duelos decididos entre dos jugadores. */
export type AdvancedRivalryStat = {
  winner: StatPlayerRef;
  loser: StatPlayerRef;
  duels: number;
  winner_wins: number;
  loser_wins: number;
  win_rate: number;
  provisional: boolean;
};

export type AdvancedFrequentRivalry = {
  a: StatPlayerRef;
  b: StatPlayerRef;
  duels: number;
  a_wins: number;
  b_wins: number;
};

export type AdvancedStreakStat = {
  player: StatPlayerRef;
  length: number;
  ongoing: boolean;
};

export type AdvancedMonthStat = {
  month: string; // 'YYYY-MM'
  games: number;
  top: { player: StatPlayerRef; wins: number; games_played: number } | null;
};

export type AdvancedNemesis = {
  player: StatPlayerRef;
  rival: StatPlayerRef;
  duels: number;
  wins: number;
  losses: number;
  win_rate: number;
};

export type AdvancedStats = {
  game: "catan" | "mus";
  totalGames: number;
  totalPlayers: number;
  bestPair: AdvancedPairStat | null;
  topRivalry: AdvancedRivalryStat | null;
  frequentRivalry: AdvancedFrequentRivalry | null;
  longestStreak: AdvancedStreakStat | null;
  bestMonth: AdvancedMonthStat | null;
  mostActive: { player: StatPlayerRef; games_played: number; wins: number; win_rate: number } | null;
  favoriteWeekday: { weekday: number; games: number; share: number } | null;
  nemeses: AdvancedNemesis[];
};

export type WrappedEntry = {
  player: StatPlayerRef;
  wins: number;
  games_played: number;
  win_rate: number;
};

export type WrappedData = {
  game: "catan" | "mus";
  year: number;
  years: number[];
  /** live = partidas registradas en la app; legacy = solo totales importados; empty = nada. */
  mode: "live" | "legacy" | "empty";
  totalGames: number | null;
  friendlyGames: number;
  totalPlayers: number;
  champion: WrappedEntry | null;
  podium: WrappedEntry[];
  longestStreak: { player: StatPlayerRef; length: number } | null;
  bestPair: AdvancedPairStat | null;
  busiestMonth: { month: string; games: number } | null;
  firstGame: string | null;
  lastGame: string | null;
  photo: { id: string; image: string; created_at: string; winner: string | null } | null;
};

export type PlayerProfile = {
  player: { id: string; name: string; color: string };
  game: "catan" | "mus";
  stats: {
    games_played: number;
    wins: number;
    win_rate: number;
    current_streak: number;
    best_streak: number;
    legacy_games?: number;
    legacy_wins?: number;
  };
  rivalries: Rivalry[];
  games: {
    id: string;
    winner_id: string;
    winner_team?: number | null;
    image?: string | null;
    counts_for_stats: boolean;
    created_at: string;
    players: { id: string; name: string; color: string; team?: number | null }[];
  }[];
};
