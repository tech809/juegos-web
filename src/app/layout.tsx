import type { Metadata } from "next";
import { EB_Garamond, Cinzel } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

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
  title: "Crónicas de la Mesa",
  description: "Registra tus partidas de Catán y Mus, y reina en el salón de la fama",
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
      </body>
    </html>
  );
}
