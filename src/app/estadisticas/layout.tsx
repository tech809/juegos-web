import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Sala de la Fama de Catán', 'Consulta el ranking de Catán, victorias, rachas y rivalidades de cada temporada.', '/estadisticas');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
