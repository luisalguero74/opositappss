import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // ⚠️ Deshabilitar errores de TypeScript en build (solo para deployment)
    ignoreBuildErrors: true,
  },
  // Aumentar límite de body para subida de archivos PDF
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
