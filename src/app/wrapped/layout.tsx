import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Resumen anual de Catán', 'Repasa el resumen anual de tus partidas de Catán, campeones y mejores momentos.', '/wrapped');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
