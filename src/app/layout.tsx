import type { Metadata, Viewport } from "next";
import { EB_Garamond, Cinzel } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://juegos.proactivefuture.eu"),
  title: { default: "Crónicas de la Mesa | Partidas de Catán y Mus", template: "%s | Crónicas de la Mesa" },
  description: "Registra partidas de Catán y Mus, consulta estadísticas, descubre rivalidades y revive los mejores momentos de tu mesa.",
  applicationName: "Crónicas de la Mesa",
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Crónicas de la Mesa",
    title: "Crónicas de la Mesa | Partidas de Catán y Mus",
    description: "Partidas, estadísticas, jugadores y momentos memorables de Catán y Mus.",
    url: "/",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Escudo de Crónicas de la Mesa" }],
  },
  twitter: { card: "summary", title: "Crónicas de la Mesa", description: "Partidas y estadísticas de Catán y Mus.", images: ["/icon-512.png"] },
  appleWebApp: {
    capable: true,
    title: "Crónicas",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7a1f2b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${garamond.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-10">
          {children}
        </main>
        <Footer />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
