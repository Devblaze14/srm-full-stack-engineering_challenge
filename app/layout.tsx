import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BFHL — Hierarchy Analyzer",
  description: "Parse edge lists, build trees, detect cycles.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
