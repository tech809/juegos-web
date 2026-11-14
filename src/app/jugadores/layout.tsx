import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Jugadores de Catán', 'Consulta los jugadores de Catán, sus partidas, victorias y estadísticas.', undefined);

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
