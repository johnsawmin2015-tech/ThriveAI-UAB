import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ThriveAI — Myanmar SME Decision Copilot",
  description:
    "Burmese-first financial intelligence that turns SME data into the next best business action.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="my">
      <body>{children}</body>
    </html>
  );
}
