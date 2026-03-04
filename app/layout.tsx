import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayFit SEO Intelligence",
  description: "Plateforme d'intelligence SEO propulsée par les agents IA Dust — Équipe SEO PayFit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
