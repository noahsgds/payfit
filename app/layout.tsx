import type { Metadata } from "next";
import "./globals.css";
import { SeoDataProvider } from "./context/SeoDataContext";

export const metadata: Metadata = {
  title: "PayFit SEO Intelligence",
  icons: {
    icon: "/Payfit-simplifiez-la-gestion-de-la-paie-et-des-RH.png", // ou .svg
    },
  description: "Plateforme d'intelligence SEO propulsée par les agents IA Dust — Équipe SEO PayFit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SeoDataProvider>{children}</SeoDataProvider>
      </body>
    </html>
  );
}
