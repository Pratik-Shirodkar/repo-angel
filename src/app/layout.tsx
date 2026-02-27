import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoAngel — Autonomous Open-Source Sponsor",
  description:
    "AI agent that autonomously evaluates and pays developers for quality open-source contributions. Powered by PinionOS x402 micropayments on Base.",
  keywords: [
    "PinionOS",
    "x402",
    "open-source",
    "autonomous",
    "USDC",
    "Base",
    "AI",
    "code review",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
