import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "opositAPPSS",
  description: "Aplicación para cuestionarios de oposiciones de Seguridad Social española",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <footer className="bg-gray-900 text-gray-400 text-center py-4 text-xs border-t border-gray-800">
          <p>© {new Date().getFullYear()} Luis Enrique Algueró Martín. Todos los derechos reservados.</p>
          <p className="mt-1">opositAPPSS - Plataforma de preparación para oposiciones de la Seguridad Social</p>
        </footer>
      </body>
    </html>
  );
}
