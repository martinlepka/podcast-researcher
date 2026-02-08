/**
 * Event Analyzer - Root Layout
 * Description: Root layout with metadata
 * Project: Event Analyzer
 * Author: MartinL
 * Created: 2026-02-07
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event Analyzer | Keboola",
  description: "Conference and event analysis dashboard for field marketing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
