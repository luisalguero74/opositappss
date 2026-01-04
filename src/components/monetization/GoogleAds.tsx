'use client'

import { useEffect } from 'react'

interface GoogleAdsProps {
  clientId: string
  slot?: string
}

export default function GoogleAds({ clientId, slot = '1234567890' }: GoogleAdsProps) {
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
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
