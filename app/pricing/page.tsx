'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Settings {
  monetizationEnabled: boolean
  freeAccessDays: number
  basicPrice: number
  premiumPrice: number
  currency: string
}

export default function PricingPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error loading settings:', err))
  }, [])

  const handleSubscribe = async (plan: 'basic' | 'premium') => {
    if (!session) {
      router.push('/login?callbackUrl=/pricing')
      return
    }

    setLoading(plan)
    setMessage('')

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Error al procesar el pago')
        setLoading(null)
        return
      }

      const stripe = await stripePromise
      if (stripe && data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error de conexión')
      setLoading(null)
    }
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando planes...</p>
      </div>
    )
  }

  if (!settings.monetizationEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">¡Acceso Gratuito!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Actualmente toda la plataforma es completamente gratuita. Disfruta de todas las funcionalidades sin límites.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition text-lg"
          >
            Ir al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const currencySymbol = settings.currency === 'EUR' ? '€' : settings.currency === 'USD' ? '$' : '£'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Elige tu Plan</h1>
          <p className="text-xl text-gray-600">Comienza con {settings.freeAccessDays} días de prueba gratuita</p>
        </div>

        {message && (
          <div className="max-w-2xl mx-auto mb-8 px-6 py-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {message}
          </div>
        )}

        {/* Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Plan Free */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🆓</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Free</h3>
              <div className="text-4xl font-bold text-gray-600 mb-2">
                0{currencySymbol}
                <span className="text-lg font-normal text-gray-500">/mes</span>
              </div>
              <p className="text-sm text-gray-500">{settings.freeAccessDays} días de prueba</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Acceso limitado a cuestionarios</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Foro de estudiantes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-400">Sin estadísticas avanzadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 font-bold">✗</span>
                <span className="text-gray-400">Sin simulacros cronometrados</span>
              </li>
            </ul>

            <div className="text-center px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg">
              Plan Actual
            </div>
          </div>

          {/* Plan Basic */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-2xl p-8 border-4 border-blue-400 transform scale-105 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-yellow-900 px-6 py-2 rounded-full font-bold text-sm shadow-lg">
              🌟 MÁS POPULAR
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl mb-4">📘</div>
              <h3 className="text-2xl font-bold text-white mb-2">Plan Basic</h3>
              <div className="text-5xl font-bold text-white mb-2">
                {settings.basicPrice.toFixed(2)}{currencySymbol}
                <span className="text-lg font-normal text-blue-100">/mes</span>
              </div>
              <p className="text-sm text-blue-100">Facturación mensual</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-yellow-300 font-bold">✓</span>
                <span className="text-white">Acceso ilimitado a cuestionarios</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-300 font-bold">✓</span>
                <span className="text-white">Estadísticas personales completas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-300 font-bold">✓</span>
                <span className="text-white">Foro premium</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-300 font-bold">✓</span>
                <span className="text-white">Historial de progreso</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('basic')}
              disabled={loading !== null}
              className="w-full px-6 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition shadow-lg text-lg disabled:opacity-50"
            >
              {loading === 'basic' ? 'Procesando...' : 'Suscribirme a Basic'}
            </button>
          </div>

          {/* Plan Premium */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-purple-200">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">👑</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Premium</h3>
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {settings.premiumPrice.toFixed(2)}{currencySymbol}
                <span className="text-lg font-normal text-gray-500">/mes</span>
              </div>
              <p className="text-sm text-gray-500">Facturación mensual</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">✓</span>
                <span className="text-gray-700">Todo lo de Basic</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">✓</span>
                <span className="text-gray-700">Simulacros cronometrados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">✓</span>
                <span className="text-gray-700">Análisis de errores repetidos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">✓</span>
                <span className="text-gray-700">Soporte prioritario</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">✓</span>
                <span className="text-gray-700">Acceso anticipado a nuevas funciones</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe('premium')}
              disabled={loading !== null}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg disabled:opacity-50"
            >
              {loading === 'premium' ? 'Procesando...' : 'Suscribirme a Premium'}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Preguntas Frecuentes</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">¿Puedo cancelar en cualquier momento?</h3>
              <p className="text-gray-600">Sí, puedes cancelar tu suscripción cuando quieras. Seguirás teniendo acceso hasta el final de tu período de facturación.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-800 mb-2">¿Qué métodos de pago aceptan?</h3>
              <p className="text-gray-600">Aceptamos tarjetas de crédito/débito, Bizum, y transferencias SEPA a través de Stripe.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-800 mb-2">¿Hay período de prueba?</h3>
              <p className="text-gray-600">Sí, todos los nuevos usuarios tienen {settings.freeAccessDays} días de acceso gratuito para probar todas las funcionalidades.</p>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-2">¿Puedo cambiar de plan después?</h3>
              <p className="text-gray-600">Por supuesto. Puedes hacer upgrade o downgrade en cualquier momento desde tu perfil.</p>
            </div>
          </div>
        </div>

        {/* Garantía */}
        <div className="mt-12 text-center">
          <div className="inline-block bg-green-50 border-2 border-green-200 rounded-full px-8 py-4">
            <p className="text-green-800 font-semibold">
              🛡️ Garantía de satisfacción - Cancela cuando quieras sin compromisos
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
