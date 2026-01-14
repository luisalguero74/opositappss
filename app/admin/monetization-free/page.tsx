'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MonetizationManual from '@/components/monetization/MonetizationManual'

interface MonetizationSettings {
  adsEnabled: boolean
  adsenseClientId: string
  affiliatesEnabled: boolean
  amazonAffiliateId: string
  sponsorsEnabled: boolean
  donationsEnabled: boolean
  patreonUrl: string
  kofiUrl: string
  premiumContentEnabled: boolean
}

export default function MonetizationFreePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<MonetizationSettings>({
    adsEnabled: false,
    adsenseClientId: '',
    affiliatesEnabled: false,
    amazonAffiliateId: '',
    sponsorsEnabled: false,
    donationsEnabled: false,
    patreonUrl: '',
    kofiUrl: '',
    premiumContentEnabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
      return
    }

    if (status === 'authenticated' && String(session?.user?.role || '').toLowerCase() === 'admin') {
      loadSettings()
    }
  }, [session, status, router])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          adsEnabled: data.adsEnabled || false,
          adsenseClientId: data.adsenseClientId || '',
          affiliatesEnabled: data.affiliatesEnabled || false,
          amazonAffiliateId: data.amazonAffiliateId || '',
          sponsorsEnabled: data.sponsorsEnabled || false,
          donationsEnabled: data.donationsEnabled || false,
          patreonUrl: data.patreonUrl || '',
          kofiUrl: data.kofiUrl || '',
          premiumContentEnabled: data.premiumContentEnabled || false,
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Configuración guardada exitosamente' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        const payload = await res.json().catch(() => null)
        const reason = typeof payload?.error === 'string' ? payload.error : undefined
        const details = typeof payload?.details === 'string' ? payload.details : undefined
        if (res.status === 401) {
          setMessage({ type: 'error', text: '❌ No autorizado. Inicia sesión de admin y reintenta.' })
        } else {
          setMessage({
            type: 'error',
            text: `❌ Error al guardar configuración${reason ? `: ${reason}` : ''}${details ? `\nDetalles: ${details}` : ''}`
          })
          console.error('Settings save error:', payload)
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin" 
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
          >
            ← Volver al Panel Admin
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mt-4">
            💰 Monetización sin Suscripción
          </h1>
          <p className="text-gray-600 mt-2">
            Activa o desactiva diferentes métodos de monetización que no requieren pago de usuarios
          </p>
        </div>

        {/* Manual de Configuración */}
        <MonetizationManual />

        {/* Message */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Opciones de Monetización */}
        <div className="space-y-6">
          {/* 1. Publicidad Google AdSense */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  📺 Publicidad Contextual (Google AdSense)
                </h2>
                <p className="text-gray-600 mt-2">
                  Muestra anuncios discretos relacionados con oposiciones y educación. Ingresos estimados: €0.50-€3 por 1000 vistas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.adsEnabled}
                  onChange={(e) => setSettings({ ...settings, adsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {settings.adsEnabled && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Cliente AdSense (ca-pub-XXXXXXXX)
                </label>
                <input
                  type="text"
                  value={settings.adsenseClientId}
                  onChange={(e) => setSettings({ ...settings, adsenseClientId: e.target.value })}
                  placeholder="ca-pub-1234567890123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Obtén tu ID en: <a href="https://www.google.com/adsense" target="_blank" className="text-blue-600 hover:underline">Google AdSense</a>
                </p>
              </div>
            )}
          </div>

          {/* 2. Marketing de Afiliados */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  🔗 Marketing de Afiliados
                </h2>
                <p className="text-gray-600 mt-2">
                  Enlaces a libros, cursos y academias con comisión por venta. Ideal para recursos educativos (5-30% comisión).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.affiliatesEnabled}
                  onChange={(e) => setSettings({ ...settings, affiliatesEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {settings.affiliatesEnabled && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Afiliado Amazon Associates
                </label>
                <input
                  type="text"
                  value={settings.amazonAffiliateId}
                  onChange={(e) => setSettings({ ...settings, amazonAffiliateId: e.target.value })}
                  placeholder="tuafiliado-21"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Regístrate en: <a href="https://afiliados.amazon.es" target="_blank" className="text-orange-600 hover:underline">Amazon Associates</a>
                </p>
              </div>
            )}
          </div>

          {/* 3. Patrocinios */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  🤝 Patrocinios Institucionales
                </h2>
                <p className="text-gray-600 mt-2">
                  Como ECAP: academias y organizaciones patrocinan el acceso de sus alumnos (€200-€5000/mes por patrocinador).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.sponsorsEnabled}
                  onChange={(e) => setSettings({ ...settings, sponsorsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            
            {settings.sponsorsEnabled && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800">
                  ✅ Modo patrocinios activado. Los logos y badges de patrocinadores aparecerán en la app.
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Los patrocinadores actuales se gestionan en la configuración general.
                </p>
              </div>
            )}
          </div>

          {/* 4. Donaciones */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  ☕ Donaciones Voluntarias
                </h2>
                <p className="text-gray-600 mt-2">
                  Permite que usuarios satisfechos apoyen el proyecto con donaciones opcionales (Patreon, Ko-fi, etc.).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.donationsEnabled}
                  onChange={(e) => setSettings({ ...settings, donationsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-600"></div>
              </label>
            </div>
            
            {settings.donationsEnabled && (
              <div className="mt-4 p-4 bg-pink-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Patreon
                  </label>
                  <input
                    type="url"
                    value={settings.patreonUrl}
                    onChange={(e) => setSettings({ ...settings, patreonUrl: e.target.value })}
                    placeholder="https://www.patreon.com/tuusuario"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL de Ko-fi
                  </label>
                  <input
                    type="url"
                    value={settings.kofiUrl}
                    onChange={(e) => setSettings({ ...settings, kofiUrl: e.target.value })}
                    placeholder="https://ko-fi.com/tuusuario"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Contenido Premium Opcional */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  ⭐ Contenido Premium Opcional
                </h2>
                <p className="text-gray-600 mt-2">
                  Ofrece contenido extra opcional (simulacros oficiales, masterclasses) mientras lo básico sigue gratis.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.premiumContentEnabled}
                  onChange={(e) => setSettings({ ...settings, premiumContentEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            
            {settings.premiumContentEnabled && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-800">
                  ✅ Modo premium activado. Aparecerá una sección de "Contenido Exclusivo" en el dashboard.
                </p>
                <p className="text-xs text-purple-600 mt-2">
                  El contenido premium se gestiona desde el panel de cuestionarios.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* Resumen */}
        <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-3">📊 Resumen de Monetización Activa</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-90">Publicidad</p>
              <p className="text-2xl font-bold">{settings.adsEnabled ? '✅' : '❌'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-90">Afiliados</p>
              <p className="text-2xl font-bold">{settings.affiliatesEnabled ? '✅' : '❌'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-90">Patrocinios</p>
              <p className="text-2xl font-bold">{settings.sponsorsEnabled ? '✅' : '❌'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-90">Donaciones</p>
              <p className="text-2xl font-bold">{settings.donationsEnabled ? '✅' : '❌'}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm opacity-90">Premium Opcional</p>
              <p className="text-2xl font-bold">{settings.premiumContentEnabled ? '✅' : '❌'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
