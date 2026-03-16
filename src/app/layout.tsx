/**
 * Podcast Researcher - Root Layout
 * Description: Root layout with Montserrat + Inconsolata fonts for Podcast Researcher
 * Project: Podcast Researcher
 * Author: MartinL
 * Created: 2026-02-07
 * Updated: 2026-03-16 — Keboola brand alignment
 */

import type { Metadata } from "next";
import { Montserrat, Inconsolata } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

const inconsolata = Inconsolata({
  subsets: ["latin"],
  variable: "--font-inconsolata",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Podcast Researcher | Keboola",
  description: "Conference and event analysis dashboard for field marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${inconsolata.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
