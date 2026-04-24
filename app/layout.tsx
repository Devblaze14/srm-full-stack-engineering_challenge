import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hierarchy Analyzer · /bfhl",
  description:
    "Submit edge lists like A->B; get back validated trees, detected cycles, and a summary.",
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
