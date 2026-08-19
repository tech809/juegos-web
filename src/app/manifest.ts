import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Crónicas de la Mesa",
    short_name: "Crónicas",
    description: "Registra tus partidas de Catán y Mus, y reina en el salón de la fama",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14100a",
    theme_color: "#7a1f2b",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nueva partida de Catán", url: "/" },
      { name: "Nueva partida de Mus", url: "/mus" },
    ],
  };
}
