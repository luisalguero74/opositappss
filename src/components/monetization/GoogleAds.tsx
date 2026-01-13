'use client'

import { useEffect } from 'react'
import Script from 'next/script'

interface GoogleAdsProps {
  clientId: string
  slot?: string
}

export default function GoogleAds({ clientId, slot = '5720224718' }: GoogleAdsProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('Error loading ad:', err)
    }
  }, [])

  if (!clientId) return null

  return (
    <div className="my-4 flex justify-center">
      <Script
        id={`adsense-script-${clientId}`}
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
        crossOrigin="anonymous"
      />

      <div className="w-full max-w-3xl px-2">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  )
}
