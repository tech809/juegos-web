import type { Metadata } from "next";

export function pageMetadata(title: string, description: string, path?: string): Metadata {
  return {
    title,
    description,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      locale: "es_ES",
      siteName: "Crónicas de la Mesa",
      title: `${title} | Crónicas de la Mesa`,
      description,
      ...(path ? { url: path } : {}),
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Escudo de Crónicas de la Mesa" }],
    },
    twitter: { card: "summary", title: `${title} | Crónicas de la Mesa`, description, images: ["/icon-512.png"] },
  };
}
