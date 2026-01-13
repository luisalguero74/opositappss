import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const envValue = process.env.ADSENSE_ADS_TXT;

  const body = (envValue && envValue.trim().length > 0
    ? envValue
    : [
        "# ADS.TXT",
        "# Pega aquí exactamente el contenido que te da Google AdSense en: AdSense → Sites → ads.txt",
        "# Luego configura la variable de entorno ADSENSE_ADS_TXT en Vercel (Production) y vuelve a desplegar.",
      ].join("\n")) + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
