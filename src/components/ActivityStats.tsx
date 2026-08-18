"use client";

import CountUp from "./CountUp";
import { ChartIcon } from "./icons";

type MonthlyPoint = { month: string; count: number };

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
}

export default function ActivityStats({
  totalGames,
  gamesThisYear,
  monthly,
}: {
  totalGames: number;
  gamesThisYear: number;
  monthly: MonthlyPoint[];
}) {
  const year = new Date().getFullYear();
  const max = Math.max(1, ...monthly.map((m) => m.count));

  return (
    <div className="ornate rounded-sm bg-card p-4 sm:p-5">
      <h3 className="divider-flourish text-xs font-display font-semibold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <ChartIcon className="w-4 h-4 shrink-0" />
        Actividad
      </h3>
      <div className="flex items-end justify-around gap-4 mb-5 text-center">
        <div>
          <p className="text-3xl font-display font-black text-gold">
            <CountUp value={gamesThisYear} />
          </p>
          <p className="text-[11px] opacity-60">en {year}</p>
        </div>
        <div>
          <p className="text-3xl font-display font-black">
            <CountUp value={totalGames} />
          </p>
          <p className="text-[11px] opacity-60">en total</p>
        </div>
      </div>
      {monthly.length > 0 && (
        <div className="flex items-end gap-2 h-20">
          {monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-display font-bold opacity-70">{m.count}</span>
              <div
                className="w-full rounded-t bg-gold min-h-[3px] transition-all"
                style={{ height: `${Math.max(6, (m.count / max) * 100)}%` }}
              />
              <span className="text-[9px] opacity-50 capitalize">{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
