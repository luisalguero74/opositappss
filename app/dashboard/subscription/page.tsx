'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type ApiData = {
  hasAccess: boolean
  reason: string
  tier?: 'premium' | 'basic' | 'none'
  paywallActive?: boolean
  subscription: null | {
    plan: string
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd?: boolean
    source?: string | null
    label?: string | null
  }
  settings: null | {
    monetizationEnabled: boolean
    freeAccessDays: number
    currency: string
    basicPrice: number | null
    premiumPrice: number | null
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function SubscriptionPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/user/subscription')
        const json = (await res.json().catch(() => null)) as ApiData | null
        if (!res.ok || !json) {
          setError('No se pudo cargar tu información de suscripción.')
          setLoading(false)
          return
        }
        setData(json)
      } catch {
        setError('No se pudo cargar tu información de suscripción.')
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [])

  const statusLabel = useMemo(() => {
    if (!data) return ''

    if (data.settings && !data.settings.monetizationEnabled) {
      return 'Acceso gratuito'
    }

    if (!data.subscription) {
      return 'Sin suscripción'
    }

    const plan = String(data.subscription.plan || '').toLowerCase()
    const status = String(data.subscription.status || '').toLowerCase()

    if (status === 'active') {
      return plan === 'premium' ? 'Premium activo' : plan === 'basic' ? 'Basic activo' : 'Activo'
    }

    return `Estado: ${data.subscription.status}`
  }, [data])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-semibold inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="mt-4 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-6">
              <h1 className="text-3xl font-bold">💳 Mi suscripción</h1>
              <p className="text-indigo-100 mt-1">Estado y acceso a contenido premium</p>
            </div>

            <div className="p-6">
              {loading && <p className="text-gray-600">Cargando...</p>}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && data && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-sm text-gray-600">Estado</p>
                    <p className="text-xl font-bold text-gray-900">{statusLabel}</p>
                    <p className="text-sm text-gray-600 mt-2">{data.reason}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-sm text-gray-600">Plan</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {data.subscription?.plan ? String(data.subscription.plan).toUpperCase() : '—'}
                      </p>
                      {data.subscription?.label ? (
                        <p className="mt-2 inline-flex items-center text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">
                          {data.subscription.label}
                        </p>
                      ) : null}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-sm text-gray-600">Próxima renovación</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(data.subscription?.currentPeriodEnd ?? null)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/pricing"
                      className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition"
                    >
                      Ver planes
                    </Link>
                    <Link
                      href="/dashboard/account"
                      className="inline-flex items-center justify-center px-5 py-3 rounded-xl border-2 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-800 font-semibold transition"
                    >
                      Configuración de cuenta
                    </Link>
                  </div>

                  {data.settings && data.settings.monetizationEnabled && (
                    <div className="text-xs text-gray-500">
                      Precios actuales: Basic {data.settings.basicPrice ?? '—'} {data.settings.currency} · Premium {data.settings.premiumPrice ?? '—'} {data.settings.currency}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
