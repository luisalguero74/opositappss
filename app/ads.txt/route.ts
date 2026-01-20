import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const envValue = process.env.ADSENSE_ADS_TXT;

  const body = (envValue && envValue.trim().length > 0
    ? envValue
    : "google.com, pub-3330699408382004, DIRECT, f08c47fec0942fa0") + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
