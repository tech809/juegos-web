"use client";

import { MAX_NOTES_LENGTH } from "@/lib/notes";

/** Notas libres de la partida (anécdotas, jugadas, apuestas…). */
export default function GameNotesField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <section className="mb-5">
      <label className="block">
        <span className="text-xs font-display font-semibold uppercase tracking-[0.15em] opacity-70">
          Notas de la partida (opcional)
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={MAX_NOTES_LENGTH}
          rows={3}
          placeholder="Anécdotas, jugadas memorables, apuestas…"
          className="mt-2 block w-full resize-y rounded border-2 border-border bg-parchment-deep px-3 py-2 text-sm placeholder:italic placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-gold"
        />
        <span className="mt-1 block text-right text-[11px] opacity-50">
          {value.length}/{MAX_NOTES_LENGTH}
        </span>
      </label>
    </section>
  );
}

/** Las notas ya guardadas, en la tarjeta de la crónica. */
export function GameNotesText({ notes }: { notes?: string | null }) {
  if (!notes) return null;
  return (
    <div className="w-full bg-card px-3 py-2.5 border-t border-border text-foreground">
      <p className="text-xs font-display font-semibold uppercase tracking-wide mb-1">Notas</p>
      <p className="text-sm italic break-words whitespace-pre-wrap">{notes}</p>
    </div>
  );
}
