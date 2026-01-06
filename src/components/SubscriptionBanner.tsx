'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface AccessInfo {
  hasAccess: boolean
  reason: string
  subscription?: {
    plan: string
    status: string
    currentPeriodEnd: Date | null
  }
}

export default function SubscriptionBanner() {
  const { data: session } = useSession()
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    fetch('/api/check-access')
      .then(async res => {
        if (!res.ok) {
          // Fail-open: no mostrar banner restrictivo por errores de verificación
          setAccessInfo({ hasAccess: true, reason: 'Acceso permitido' })
          setLoading(false)
          return
        }

        const data = await res.json()
        setAccessInfo(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error checking access:', err)
        // Fail-open
        setAccessInfo({ hasAccess: true, reason: 'Acceso permitido' })
        setLoading(false)
      })
  }, [session])

  if (loading || !accessInfo) return null
  if (accessInfo.hasAccess) {
    // Mostrar banner informativo si está en período de prueba
    if (accessInfo.reason.includes('prueba')) {
      return (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold">{accessInfo.reason}</p>
              <p className="text-sm text-blue-100">Disfruta de todas las funcionalidades gratis</p>
            </div>
          </div>
          <Link 
            href="/pricing"
            className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
          >
            Ver Planes
          </Link>
        </div>
      )
    }
    return null
  }

  // Usuario sin acceso
  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔒</span>
        <div>
          <p className="font-bold text-lg">Acceso Restringido</p>
          <p className="text-sm text-red-100">{accessInfo.reason}</p>
        </div>
      </div>
      <Link 
        href="/pricing"
        className="px-6 py-3 bg-white text-red-600 font-bold rounded-lg hover:bg-red-50 transition shadow-lg"
      >
        Suscribirme Ahora
      </Link>
    </div>
  )
}
