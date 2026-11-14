import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Jugadores de Mus', 'Consulta los jugadores de Mus, sus partidas, parejas y estadísticas.', undefined);

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
