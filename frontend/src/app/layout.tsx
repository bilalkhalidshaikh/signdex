import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SignDex | B2B AI Lead Signal Radar",
  description: "Live B2B buying-signal ingestion synced with AchroCall for autonomous AI phone outreach.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
