import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Galería de Catán', 'Revive en fotos las partidas y conquistas de Catán.', '/galeria');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
