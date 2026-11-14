export const MAX_NOTES_LENGTH = 500;

/** Valida las notas de una partida: texto de hasta 500 caracteres, o vacío/null para dejarlas sin notas. */
export function parseNotes(value: unknown): { ok: true; notes: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) return { ok: true, notes: null };
  if (typeof value !== "string") return { ok: false, error: "Notas inválidas" };
  const trimmed = value.trim();
  if (trimmed.length > MAX_NOTES_LENGTH) {
    return { ok: false, error: `Las notas admiten hasta ${MAX_NOTES_LENGTH} caracteres` };
  }
  return { ok: true, notes: trimmed || null };
}
