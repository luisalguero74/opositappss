import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Replace with your real AdSense line(s) if they change.
  const body = 'google.com, ca-pub-3330699408382004, DIRECT, f08c47fec0942fa0\n'

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
