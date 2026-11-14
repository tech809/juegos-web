import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata('Resumen anual del Mus', 'Repasa el resumen anual del Mus, parejas ganadoras y mejores momentos.', '/mus/wrapped');

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
