import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Hanken Grotesk carries the interface; Bricolage Grotesque is the display
// face for headlines and page titles across marketing, blog and app.
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz"] });

export const metadata: Metadata = {
  title: {
    default: "Easymarker — website feedback without the back-and-forth",
    template: "%s | Easymarker",
  },
  description:
    "Share a link to any website. Reviewers pin comments exactly where they mean them — no downloads, no accounts, no email threads.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${jetbrainsMono.variable} ${bricolage.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
