'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const ADSENSE_CLIENT = 'ca-pub-3330699408382004'

// Keep this list very strict to avoid serving (Auto) Ads on thin/auth pages.
const ADSENSE_ALLOWED_PATHS = new Set<string>(['/'])

export function AdSenseLoader() {
  const pathname = usePathname()

  if (!ADSENSE_ALLOWED_PATHS.has(pathname)) return null

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
