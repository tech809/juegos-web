export type Badge = { label: string; tone: "gold" | "wine" | "forest" };

export function computeBadges(p: {
  games_played: number;
  wins: number;
  win_rate?: number;
  current_streak?: number;
  best_streak?: number;
}): Badge[] {
  const badges: Badge[] = [];
  if (p.games_played === 0) return badges;

  const rate = p.win_rate ?? (p.games_played > 0 ? p.wins / p.games_played : 0);

  if ((p.current_streak ?? 0) >= 2) {
    badges.push({ label: `Racha de ${p.current_streak}`, tone: "wine" });
  }
  if ((p.best_streak ?? 0) >= 3) {
    badges.push({ label: `Mejor racha: ${p.best_streak}`, tone: "gold" });
  }
  if (p.games_played >= 3 && rate === 1) {
    badges.push({ label: "Invicto", tone: "gold" });
  }
  if (p.games_played === 1) {
    badges.push({ label: "Debutante", tone: "forest" });
  }
  if (p.games_played >= 10) {
    badges.push({ label: "Veterano", tone: "forest" });
  }
  return badges;
}

export const BADGE_TONE_CLASS: Record<Badge["tone"], string> = {
  gold: "bg-gold-bright/20 text-gold border-gold/50",
  wine: "bg-wine/15 text-wine border-wine/40",
  forest: "bg-forest/15 text-forest border-forest/40",
};
