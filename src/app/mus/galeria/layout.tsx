import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Galería del Mus', 'Las fotos y mejores momentos de las partidas de Mus.', '/mus/galeria');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
