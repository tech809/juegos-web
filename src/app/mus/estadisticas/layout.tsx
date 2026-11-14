import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Sala de la Fama del Mus', 'Descubre el ranking del Mus, las parejas más fuertes, victorias, rachas y rivalidades.', '/mus/estadisticas');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
