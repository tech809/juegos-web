import type { MetadataRoute } from "next";

const site = "https://juegos.proactivefuture.eu";
const paths = ["/", "/mus", "/estadisticas", "/mus/estadisticas", "/jugadores", "/mus/jugadores", "/galeria", "/mus/galeria", "/wrapped", "/mus/wrapped"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({ url: `${site}${path}`, changeFrequency: "weekly", priority: path === "/" || path === "/mus" ? 1 : 0.7 }));
}
