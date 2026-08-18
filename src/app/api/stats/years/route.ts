import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSchema();

  const legacyYearsRes = await db.execute(
    "SELECT DISTINCT year FROM legacy_stats WHERE game = 'catan' ORDER BY year ASC"
  );
  const realYearsRes = await db.execute(
    "SELECT DISTINCT strftime('%Y', created_at) as year FROM games WHERE game = 'catan' AND counts_for_stats = 1 ORDER BY year ASC"
  );

  const years = new Set<number>();
  for (const row of legacyYearsRes.rows) years.add(Number(row.year));
  for (const row of realYearsRes.rows) years.add(Number(row.year));
  years.add(new Date().getFullYear());

  return NextResponse.json({
    years: Array.from(years).sort((a, b) => a - b),
    currentYear: new Date().getFullYear(),
  });
}
