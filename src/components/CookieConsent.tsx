'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Siempre true, no se puede desactivar
    functional: true,
    analytics: false,
    advertising: false,
  })

  useEffect(() => {
    // Verificar si el usuario ya dio su consentimiento
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // Mostrar banner después de 1 segundo
      setTimeout(() => setShowBanner(true), 1000)
    } else {
      // Cargar preferencias guardadas
      try {
        const saved = JSON.parse(consent)
        setPreferences(saved)
        loadScripts(saved)
      } catch (e) {
        console.error('Error parsing cookie consent:', e)
      }
    }
  }, [])

  const loadScripts = (prefs: typeof preferences) => {
    // Cargar Google Analytics si está permitido
    if (prefs.analytics && typeof window !== 'undefined') {
      // Google Analytics code aquí si lo implementas
      console.log('Analytics enabled')
    }

    // Los scripts de AdSense ya están en el layout
    if (prefs.advertising) {
      console.log('Advertising enabled')
    }
  }

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      advertising: true,
    }
    savePreferences(allAccepted)
  }

  const rejectNonEssential = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      advertising: false,
    }
    savePreferences(onlyNecessary)
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
  }

  const savePreferences = (prefs: typeof preferences) => {
    localStorage.setItem('cookie_consent', JSON.stringify(prefs))
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    setPreferences(prefs)
    loadScripts(prefs)
    setShowBanner(false)
    setShowSettings(false)
  }

  if (!showBanner) return null

  return (
    <>
      {/* Banner Principal */}
      {!showSettings && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-600 shadow-2xl z-50 animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-2xl">🍪</span>
                  Usamos cookies
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Utilizamos cookies propias y de terceros (como Google AdSense) para mejorar tu 
                  experiencia, mostrar publicidad personalizada y analizar el uso del sitio. 
                  Al hacer clic en &quot;Aceptar todas&quot;, aceptas el uso de todas las cookies. 
                  Puedes configurar tus preferencias o rechazar las cookies no esenciales.
                </p>
                <Link 
                  href="/cookies" 
                  className="text-blue-600 hover:underline text-sm font-medium mt-2 inline-block"
                >
                  Más información sobre cookies →
                </Link>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm whitespace-nowrap"
                >
                  ⚙️ Configurar
                </button>
                <button
                  onClick={rejectNonEssential}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium text-sm whitespace-nowrap"
                >
                  Rechazar opcionales
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition font-semibold text-sm whitespace-nowrap shadow-lg"
                >
                  ✓ Aceptar todas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Configuración */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-t-xl">
              <h2 className="text-2xl font-bold">Configuración de Cookies</h2>
              <p className="text-blue-100 text-sm mt-1">
                Personaliza tus preferencias de privacidad
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Necesarias */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      🔒 Cookies Estrictamente Necesarias
                    </h3>
                    <p className="text-sm text-gray-600">
                      Esenciales para el funcionamiento del sitio (sesión, seguridad). 
                      No se pueden desactivar.
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Siempre activas
                    </span>
                  </div>
                </div>
              </div>

              {/* Funcionales */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      🎨 Cookies de Funcionalidad
                    </h3>
                    <p className="text-sm text-gray-600">
                      Permiten recordar tus preferencias (tema, idioma, configuraciones).
                    </p>
                  </div>
                  <label className="ml-4 relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Analíticas */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      📊 Cookies Analíticas
                    </h3>
                    <p className="text-sm text-gray-600">
                      Nos ayudan a entender cómo usas el sitio para mejorarlo 
                      (Google Analytics).
                    </p>
                  </div>
                  <label className="ml-4 relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Publicidad */}
              <div className="border rounded-lg p-4 border-yellow-300 bg-yellow-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      🎯 Cookies de Publicidad (Google AdSense)
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Permiten mostrar anuncios relevantes y medir su efectividad. 
                      Gestionadas por Google.
                    </p>
                    <a 
                      href="https://policies.google.com/technologies/ads" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Ver política de Google AdSense →
                    </a>
                  </div>
                  <label className="ml-4 relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.advertising}
                      onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="text-gray-700">
                  <strong>ℹ️ Nota:</strong> Puedes cambiar estas preferencias en cualquier momento 
                  desde el footer de nuestra página o consultando nuestra{' '}
                  <Link href="/cookies" className="text-blue-600 hover:underline font-medium">
                    Política de Cookies
                  </Link>.
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={rejectNonEssential}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Solo necesarias
              </button>
              <button
                onClick={saveCustomPreferences}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition font-semibold shadow-lg"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS para animación */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
