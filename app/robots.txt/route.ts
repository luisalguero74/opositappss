import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const body = [
    "User-agent: *",
    "Allow: /",
  ].join("\n") + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
