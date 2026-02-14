import { NextResponse } from 'next/server'

export async function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://www.opositapp.site/sitemap.xml'
  ].join('\n')

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}
