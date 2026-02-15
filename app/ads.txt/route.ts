import { NextResponse } from 'next/server'

export async function GET() {
  // IMPORTANT: Update ca-pub-3330699408382004 with your ACTUAL Google AdSense Publisher ID
  // Get your Publisher ID from: Google AdSense > Account > Account Information
  // Format must be: google.com, ca-pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
  
  const body = `# Google AdSense
google.com, ca-pub-3330699408382004, DIRECT, f08c47fec0942fa0

# This file must be publicly accessible at: https://yourdomain.com/ads.txt
# Update the Publisher ID above before submitting for AdSense approval
`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    }
  })
}
