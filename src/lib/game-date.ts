/** Fecha de calendario local; se guarda a mediodía para no cruzar de día al mostrarla. */
export function gameDateToTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  if (value > new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })) return null;
  return `${value} 12:00:00`;
}
