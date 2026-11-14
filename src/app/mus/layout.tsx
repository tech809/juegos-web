import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Mus: partidas y estadísticas', 'Registra partidas de Mus por parejas, consulta la crónica y sigue las estadísticas de la mesa.', undefined);

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
