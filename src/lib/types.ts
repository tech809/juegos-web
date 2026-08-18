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

export type PlayerProfile = {
  player: { id: string; name: string; color: string };
  stats: {
    games_played: number;
    wins: number;
    win_rate: number;
    current_streak: number;
    best_streak: number;
  };
  rivalries: Rivalry[];
  games: {
    id: string;
    winner_id: string;
    image?: string | null;
    counts_for_stats: boolean;
    created_at: string;
    players: { id: string; name: string; color: string }[];
  }[];
};
