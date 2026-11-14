import type { ReactNode } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";
import CountUp from "./CountUp";
import PlayerAvatar from "./PlayerAvatar";
import RadialStat from "./RadialStat";
import Skeleton from "./Skeleton";
import { computeBadges } from "@/lib/badges";
import { CrownIcon, FlameIcon, LaurelIcon, TrophyIcon } from "./icons";
import styles from "./HallOfFame.module.css";

const PLACES = ["La corona", "Plata", "Bronce"];

export function HallOfFameSkeleton() {
  return (
    <div aria-label="Cargando la Sala de la Fama" aria-busy="true" className="space-y-6">
      <Skeleton className="h-96 w-full rounded-xl" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export default function HallOfFame({
  game,
  players,
  subtitle,
  filters,
}: {
  game: "catan" | "mus";
  players: LeaderboardEntry[];
  subtitle: ReactNode;
  filters?: ReactNode;
}) {
  const podium = players.slice(0, 3);
  const rest = players.slice(3);
  const playerPath = game === "mus" ? "/mus/jugadores" : "/jugadores";

  return (
    <>
      <section className={`${styles.hall} ${game === "mus" ? styles.mus : ""}`} aria-labelledby="hall-title">
        <div className={styles.aura} aria-hidden="true" />
        <header className={styles.header}>
          <div className={styles.sigil} aria-hidden="true"><CrownIcon /></div>
          <p className={styles.kicker}>Crónicas de {game === "mus" ? "la mesa de Mus" : "Catán"}</p>
          <div className={styles.title}>
            <span aria-hidden="true"><LaurelIcon className={styles.laurel} /></span>
            <h1 id="hall-title" className="font-display">Sala de la Fama</h1>
            <span aria-hidden="true"><LaurelIcon className={styles.laurel} flip /></span>
          </div>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        {filters && <div className={styles.filters}>{filters}</div>}

        {podium.length > 0 ? (
          <ol className={styles.podium} aria-label="Los tres primeros puestos">
            {podium.map((player, index) => {
              const badge = computeBadges(player)[0];
              const rate = Math.round(player.win_rate * 100);
              return (
                <li key={player.id} className={styles.place} data-rank={index + 1}>
                  <Link href={`${playerPath}/${player.id}`} className={styles.contender} aria-label={`${index + 1}º puesto: ${player.name}, ${player.wins} victorias, ${rate}% de victorias`}>
                    <span className={styles.placeLabel} aria-hidden="true">
                      {index === 0 ? <CrownIcon className={styles.crown} /> : PLACES[index]}
                    </span>
                    <div className={styles.portrait}>
                      <RadialStat percent={rate} color={player.color} size={index === 0 ? 74 : 60} strokeWidth={3}>
                        <PlayerAvatar name={player.name} color={player.color} photo={player.photo} size={index === 0 ? 58 : 46} bordered />
                      </RadialStat>
                    </div>
                    <p className={styles.name} title={player.name}>{player.name}</p>
                    <div className={styles.result}>
                      <p className={styles.wins}><CountUp value={player.wins} /> <span>victorias</span></p>
                      <p className={styles.games}>{player.games_played} <span>partidas</span></p>
                      <p className={styles.rate}>{rate}% <span>de victorias</span></p>
                    </div>
                    <span className={styles.badge} title={badge?.label}>
                      {player.current_streak >= 2 ? <><FlameIcon className="w-3 h-3 shrink-0" /> Racha de {player.current_streak}</> : badge?.label ?? PLACES[index]}
                    </span>
                    <div className={styles.pedestal} aria-hidden="true">
                      <span className="font-display">{index + 1}</span>
                      {index === 0 && <TrophyIcon className={styles.trophy} />}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.empty}>La próxima leyenda está por escribirse. Juega más partidas para conquistar el podio.</p>
        )}
        <p className={styles.footer}><span aria-hidden="true">✦</span> Honor a quienes dominan {game === "mus" ? "la mesa" : "la isla"} <span aria-hidden="true">✦</span></p>
      </section>

      {rest.length > 0 && (
        <section className={`${styles.ranking} ${game === "mus" ? styles.rankingMus : ""}`} aria-labelledby="ranking-title">
          <div className={styles.rankingHeader}>
            <h3 id="ranking-title" className="font-display">{game === "mus" ? "El resto de la mesa" : "El resto de la corte"}</h3>
            <span>{players.length} aspirantes</span>
          </div>
          <ol start={4} className={styles.rankingList}>
            {rest.map((player, index) => {
              const rate = Math.round(player.win_rate * 100);
              return (
                <li key={player.id}>
                  <Link href={`${playerPath}/${player.id}`} className={styles.rankingRow}>
                    <span className={styles.rank}>{String(index + 4).padStart(2, "0")}</span>
                    <PlayerAvatar name={player.name} color={player.color} photo={player.photo} size={36} />
                    <div className={styles.rankingPlayer}>
                      <p className="font-display font-semibold truncate">{player.name}</p>
                      <p className={styles.record}>{player.wins} victorias · {player.games_played} partidas
                        {player.current_streak >= 2 && <span className={styles.streak}><FlameIcon className="w-3 h-3" />{player.current_streak}</span>}
                      </p>
                    </div>
                    <div className={styles.rankingRate}>
                      <strong className="font-display">{rate}%</strong>
                      <div className={styles.bar} aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, rate))}%`, backgroundColor: player.color }} /></div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
