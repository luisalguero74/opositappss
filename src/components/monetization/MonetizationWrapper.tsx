'use client'

import { useEffect, useState } from 'react'
import GoogleAds from './GoogleAds'
import AffiliatesSection from './AffiliatesSection'
import DonationButtons from './DonationButtons'

interface MonetizationSettings {
  adsEnabled: boolean
  adsenseClientId: string | null
  affiliatesEnabled: boolean
  amazonAffiliateId: string | null
  donationsEnabled: boolean
  patreonUrl: string | null
  kofiUrl: string | null
}

interface MonetizationWrapperProps {
  position: 'dashboard' | 'test-end' | 'sidebar'
}

export default function MonetizationWrapper({ position }: MonetizationWrapperProps) {
  const [settings, setSettings] = useState<MonetizationSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings')
        if (res.ok) {
          const data = await res.json()
          setSettings({
            adsEnabled: data.adsEnabled || false,
            adsenseClientId: data.adsenseClientId || null,
            affiliatesEnabled: data.affiliatesEnabled || false,
            amazonAffiliateId: data.amazonAffiliateId || null,
            donationsEnabled: data.donationsEnabled || false,
            patreonUrl: data.patreonUrl || null,
            kofiUrl: data.kofiUrl || null,
          })
        }
      } catch (error) {
        console.error('Error loading monetization settings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  if (loading || !settings) return null

  // Dashboard: Afiliados + Donaciones
  if (position === 'dashboard') {
    return (
      <div className="space-y-6">
        {settings.affiliatesEnabled && settings.amazonAffiliateId && (
          <AffiliatesSection amazonId={settings.amazonAffiliateId} />
        )}
        {settings.donationsEnabled && (
          <DonationButtons 
            patreonUrl={settings.patreonUrl || undefined}
            kofiUrl={settings.kofiUrl || undefined}
          />
        )}
      </div>
    )
  }

  // Fin de test: Anuncios + Donaciones
  if (position === 'test-end') {
    return (
      <div className="space-y-6">
        {settings.adsEnabled && settings.adsenseClientId && (
          <GoogleAds clientId={settings.adsenseClientId} />
        )}
        {settings.donationsEnabled && (
          <DonationButtons 
            patreonUrl={settings.patreonUrl || undefined}
            kofiUrl={settings.kofiUrl || undefined}
          />
        )}
      </div>
    )
  }

  // Sidebar: Solo anuncios pequeños
  if (position === 'sidebar') {
    return (
      <div>
        {settings.adsEnabled && settings.adsenseClientId && (
          <GoogleAds clientId={settings.adsenseClientId} slot="9876543210" />
        )}
      </div>
    )
  }

  return null
}
