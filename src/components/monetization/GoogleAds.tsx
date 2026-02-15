'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    adsbygoogle: any[]
  }
}

interface GoogleAdsProps {
  clientId: string
  slot?: string
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical'
}

export default function GoogleAds({ 
  clientId, 
  slot = '1234567890', 
  format = 'auto' 
}: GoogleAdsProps) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (err) {
      console.error('Error loading AdSense ad:', err)
    }
  }, [])

  // Validar que el clientId sea correcto
  if (!clientId || !clientId.startsWith('ca-pub-')) {
    console.warn('Invalid AdSense client ID:', clientId)
    return null
  }

  return (
    <div className="my-4 flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
