import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "opositAPPSS - Preparación Oposiciones Administrativo Seguridad Social",
  description: "Plataforma completa para preparar oposiciones a Administrativo de la Seguridad Social. Tests, simulacros, asistente IA, supuestos prácticos y más.",
  keywords: "oposiciones, seguridad social, administrativo, tests, simulacros, preparación oposiciones, temario seguridad social",
  authors: [{ name: "Luis Enrique Algueró Martín" }],
  openGraph: {
    title: "opositAPPSS - Preparación Oposiciones",
    description: "La mejor plataforma para preparar oposiciones a Administrativo de la Seguridad Social",
    type: "website",
    locale: "es_ES",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3330699408382004"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <CookieConsent />
        <footer className="bg-gray-900 text-gray-400 text-center py-4 text-xs border-t border-gray-800">
          <p>© {new Date().getFullYear()} Luis Enrique Algueró Martín. Todos los derechos reservados.</p>
          <p className="mt-1">opositAPPSS - Plataforma de preparación para oposiciones de la Seguridad Social</p>
        </footer>
      </body>
    </html>
  );
}
