import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SUCATA IN BOX — Elenco Oficial | (CBLOW)",
  description:
    "Apresentação oficial dos atletas da equipe SUCATA IN BOX no campeonato CBLOW (Copa Brasil Low Elo). Status de live na Kick, estatísticas de elo e perfis no op.gg.",
  keywords: [
    "Sucata in Box",
    "CBLOW",
    "Copa Brasil Low Elo",
    "League of Legends",
    "LoL",
    "YouGlubGlub",
    "Aninha Gameplay",
    "Yasuocadeirante",
    "Mychamaqueeuvou",
  ],
  icons: {
    icon: "/sucata-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="flex min-h-full flex-col bg-background text-zinc-100 selection:bg-accent selection:text-white">
        {children}
      </body>
    </html>
  );
}
