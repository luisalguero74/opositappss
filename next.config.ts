import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Aumentar límite de body para subida de archivos PDF
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Configurar dominios externos para imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
