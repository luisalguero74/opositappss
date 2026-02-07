'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Settings {
  id: string
  monetizationEnabled: boolean
  freeAccessDays: number
  basicPrice: number
  premiumPrice: number
  currency: string
}

interface Subscription {
  id: string
  userId: string
  plan: string
  status: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt: Date
  user: {
    id: string
    email: string
    createdAt: Date
  }
}

export default function MonetizationSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
      return
    }

    // Solo cargar datos si el usuario está autenticado y es admin
    if (status === 'authenticated' && String(session?.user?.role || '').toLowerCase() === 'admin') {
      loadData()
    }
  }, [session, status, router])

  const loadData = async () => {
    try {
      const [settingsRes, subsRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/subscriptions')
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json()
        setSubscriptions(subsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        const payload = await res.json().catch(() => null)
        const reason = typeof payload?.error === 'string' ? payload.error : undefined
        const details = typeof payload?.details === 'string' ? payload.details : undefined
        if (res.status === 401) {
          setMessage({ type: 'error', text: 'No autorizado. Inicia sesión de admin y reintenta.' })
        } else {
          setMessage({ type: 'error', text: `Error al guardar configuración${reason ? `: ${reason}` : ''}${details ? `\nDetalles: ${details}` : ''}` })
          console.error('Settings save error:', payload)
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSubscription = async (userId: string, updates: { plan: string; status: string }) => {
    try {
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      const res = await fetch(`/api/admin/subscriptions/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          currentPeriodEnd: currentPeriodEnd.toISOString()
        })
      })

      if (res.ok) {
        await loadData()
        setMessage({ type: 'success', text: 'Suscripción actualizada' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando...</p>
      </div>
    )
  }

  if (!settings) return null

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
  const totalRevenue = activeSubscriptions.reduce((sum, sub) => {
    const price = sub.plan === 'basic' ? settings.basicPrice : settings.premiumPrice
    return sum + price
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-2 inline-block">
                ← Volver al Panel de Administración
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">💰 Sistema de Monetización</h1>
              <p className="text-gray-600 mt-1">Configura planes y gestiona suscripciones</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowInstructions(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
              >
                📖 Instrucciones
              </button>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  {settings.monetizationEnabled ? '✓ Activo' : '✗ Inactivo'}
                </div>
                <div className="text-sm text-gray-600">Estado del sistema</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Instrucciones */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowInstructions(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">📖 Manual de Configuración - Sistema de Monetización</h2>
                  <button onClick={() => setShowInstructions(false)} className="text-white hover:text-gray-200 text-3xl font-bold">
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                {/* Paso 1 */}
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">1️⃣ Activar/Desactivar el Sistema</h3>
                  <p className="text-gray-700 mb-3">
                    El <strong>toggle principal</strong> en la sección "Configuración General" controla si el sistema de monetización está activo.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li><strong>Activado:</strong> Los usuarios necesitarán una suscripción activa para acceder al contenido premium.</li>
                    <li><strong>Desactivado:</strong> Todos los usuarios tienen acceso gratuito ilimitado (útil para pruebas o períodos promocionales).</li>
                  </ul>
                </div>

                {/* Paso 2 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">2️⃣ Configurar Período de Prueba</h3>
                  <p className="text-gray-700 mb-3">
                    Define cuántos días de <strong>acceso gratuito</strong> tendrán los nuevos usuarios al registrarse.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Valor predeterminado: <strong>7 días</strong></li>
                    <li>Durante este período, el usuario puede usar todas las funcionalidades sin restricciones.</li>
                    <li>Después del período de prueba, se requerirá una suscripción activa.</li>
                  </ul>
                </div>

                {/* Paso 3 */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">3️⃣ Configurar Precios de Planes</h3>
                  <p className="text-gray-700 mb-3">
                    Ajusta los precios de los planes <strong>Basic</strong> y <strong>Premium</strong>:
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-gray-800">📘 Plan Basic (Predeterminado: €9.99/mes)</p>
                      <p className="text-sm text-gray-600">Acceso ilimitado a cuestionarios, estadísticas personales y foro premium.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">👑 Plan Premium (Predeterminado: €19.99/mes)</p>
                      <p className="text-sm text-gray-600">Todo lo de Basic + simulacros cronometrados, análisis de errores y soporte prioritario.</p>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-3 text-sm">
                    💡 <strong>Tip:</strong> Puedes cambiar la moneda entre EUR, USD y GBP según tu mercado objetivo.
                  </p>
                </div>

                {/* Paso 4 */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">4️⃣ Guardar Configuración</h3>
                  <p className="text-gray-700 mb-3">
                    Una vez realizados los cambios, haz clic en el botón <strong>"💾 Guardar Configuración"</strong> al final de la página.
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li>Los cambios se aplicarán inmediatamente a todos los usuarios.</li>
                    <li>Recibirás una confirmación visual cuando se guarde correctamente.</li>
                  </ul>
                </div>

                {/* Paso 5 */}
                <div className="border-l-4 border-indigo-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">5️⃣ Gestionar Suscripciones de Usuarios</h3>
                  <p className="text-gray-700 mb-3">
                    En la tabla de <strong>"Suscripciones Activas"</strong> puedes:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                    <li><strong>Ver todas las suscripciones:</strong> Email, plan actual, estado y fecha de renovación.</li>
                    <li><strong>Cambiar plan de usuario:</strong> Usa el dropdown en "Acciones" para upgrade/downgrade.</li>
                    <li><strong>Cancelar suscripción:</strong> Selecciona "Cancelar" en el menú de acciones.</li>
                    <li><strong>Otorgar acceso manual:</strong> Asigna planes Basic o Premium sin necesidad de pago.</li>
                  </ul>
                </div>

                {/* Paso 6 */}
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">6️⃣ Configurar Stripe (Pagos Automáticos)</h3>
                  <p className="text-gray-700 mb-3">
                    Para recibir pagos automáticamente, sigue estos pasos:
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">📝 Paso 1: Crear cuenta en Stripe</h4>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-4 text-sm">
                      <li>Ve a <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener" className="text-blue-600 underline">dashboard.stripe.com/register</a></li>
                      <li>Completa el registro con tus datos empresariales</li>
                      <li>Verifica tu identidad (necesario para recibir pagos)</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">🔑 Paso 2: Obtener API Keys</h4>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-4 text-sm">
                      <li>En el dashboard de Stripe, ve a <strong>Developers → API keys</strong></li>
                      <li>Copia tu <strong>Publishable key</strong> (empieza con pk_test_...)</li>
                      <li>Copia tu <strong>Secret key</strong> (empieza con sk_test_...)</li>
                      <li>Guárdalas en el archivo <code className="bg-gray-100 px-2 py-1 rounded">.env</code>:</li>
                    </ol>
                    <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`STRIPE_SECRET_KEY=sk_test_tu_clave_secreta
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_tu_clave_publica`}
                    </pre>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">🔔 Paso 3: Configurar Webhook</h4>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-4 text-sm">
                      <li>En Stripe, ve a <strong>Developers → Webhooks</strong></li>
                      <li>Haz clic en <strong>"Add endpoint"</strong></li>
                      <li>Endpoint URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">https://tudominio.com/api/webhooks/stripe</code></li>
                      <li>Selecciona estos eventos:
                        <ul className="list-disc ml-6 mt-1">
                          <li>checkout.session.completed</li>
                          <li>customer.subscription.updated</li>
                          <li>customer.subscription.deleted</li>
                          <li>invoice.payment_failed</li>
                        </ul>
                      </li>
                      <li>Copia el <strong>Signing secret</strong> (whsec_...)</li>
                      <li>Agrégalo al <code className="bg-gray-100 px-2 py-1 rounded">.env</code>:</li>
                    </ol>
                    <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs">
{`STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret`}
                    </pre>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">🚀 Paso 4: Activar Monetización</h4>
                    <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-4 text-sm">
                      <li>Reinicia el servidor de desarrollo para aplicar las variables de entorno</li>
                      <li>Vuelve a esta página y activa el toggle de monetización</li>
                      <li>Los usuarios verán la página <strong>/pricing</strong> con los planes configurados</li>
                      <li>Al suscribirse, serán redirigidos a Stripe Checkout</li>
                      <li>Después del pago, su suscripción se activará automáticamente</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Modo de Prueba:</strong> Las keys que empiezan con <code>sk_test_</code> y <code>pk_test_</code> son para pruebas.
                      Usa tarjetas de prueba de Stripe (<code>4242 4242 4242 4242</code>) para probar sin cargos reales.
                      Cuando estés listo para producción, cambia a las keys que empiezan con <code>sk_live_</code> y <code>pk_live_</code>.
                    </p>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">📊 Monitoreo de Ingresos</h3>
                  <p className="text-gray-700 mb-3">
                    Las tarjetas de estadísticas en la parte superior muestran en tiempo real:
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white rounded p-3 shadow">
                      <p className="font-semibold text-blue-600">Total Suscripciones</p>
                      <p className="text-gray-600">Número total de usuarios con suscripción registrada</p>
                    </div>
                    <div className="bg-white rounded p-3 shadow">
                      <p className="font-semibold text-green-600">Activas</p>
                      <p className="text-gray-600">Suscripciones con estado "active" (pagando)</p>
                    </div>
                    <div className="bg-white rounded p-3 shadow">
                      <p className="font-semibold text-purple-600">Ingresos Mensuales</p>
                      <p className="text-gray-600">Cálculo estimado basado en suscripciones activas</p>
                    </div>
                    <div className="bg-white rounded p-3 shadow">
                      <p className="font-semibold text-orange-600">Premium</p>
                      <p className="text-gray-600">Usuarios en el plan de mayor valor</p>
                    </div>
                  </div>
                </div>

                {/* Mejores Prácticas */}
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">💡 Mejores Prácticas</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Prueba primero:</strong> Desactiva la monetización durante la fase de pruebas para evitar confusión.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Período de prueba generoso:</strong> 7 días permiten a los usuarios experimentar el valor antes de pagar.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Comunica los cambios:</strong> Avisa a los usuarios antes de activar el sistema de pagos.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Monitorea regularmente:</strong> Revisa las estadísticas para identificar tendencias y optimizar precios.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t-2 border-gray-200">
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition"
                >
                  Cerrar Manual
                </button>
              </div>
            </div>
          </div>
        )}

        {message.text && (
          <div className={`mb-6 px-6 py-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-blue-600">{subscriptions.length}</div>
            <div className="text-sm text-gray-600">Total Suscripciones</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-green-600">{activeSubscriptions.length}</div>
            <div className="text-sm text-gray-600">Activas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-purple-600">
              {totalRevenue.toFixed(2)} {settings.currency}
            </div>
            <div className="text-sm text-gray-600">Ingresos Mensuales</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-orange-600">
              {subscriptions.filter(s => s.plan === 'premium').length}
            </div>
            <div className="text-sm text-gray-600">Premium</div>
          </div>
        </div>

        {/* Botón Grande de Activación/Desactivación */}
        <div className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                {settings.monetizationEnabled ? '🟢 Sistema de Monetización Activo' : '🔴 Sistema de Monetización Desactivado'}
              </h2>
              <p className="text-white text-opacity-90 mb-4">
                {settings.monetizationEnabled 
                  ? 'Los usuarios necesitan una suscripción activa para acceder al contenido premium. Los nuevos usuarios tienen ' + settings.freeAccessDays + ' días de prueba gratuita.'
                  : 'Todos los usuarios tienen acceso gratuito ilimitado a todas las funcionalidades. Activa el sistema cuando estés listo para comenzar a monetizar.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setSettings({ ...settings, monetizationEnabled: !settings.monetizationEnabled })
                    setSaving(true)
                    try {
                      const res = await fetch('/api/admin/settings', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...settings, monetizationEnabled: !settings.monetizationEnabled })
                      })
                      if (res.ok) {
                        setMessage({ 
                          type: 'success', 
                          text: `Sistema ${!settings.monetizationEnabled ? 'activado' : 'desactivado'} exitosamente` 
                        })
                        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
                      }
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Error al cambiar el estado' })
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                  className={`px-8 py-3 rounded-lg font-bold transition shadow-lg ${
                    settings.monetizationEnabled
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-white hover:bg-gray-100 text-green-700'
                  } disabled:opacity-50`}
                >
                  {saving ? 'Procesando...' : (settings.monetizationEnabled ? '⏸️ Desactivar Ahora' : '▶️ Activar Ahora')}
                </button>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition backdrop-blur-sm border-2 border-white border-opacity-50"
                >
                  📖 Ver Guía
                </button>
              </div>
            </div>
            <div className="ml-8 text-right">
              <div className="text-7xl mb-2">
                {settings.monetizationEnabled ? '✅' : '⭕'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración General */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Configuración General</h2>

            <div className="space-y-6">
              {/* Estado Actual */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${settings.monetizationEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <h3 className="font-bold text-gray-800">
                    Estado: {settings.monetizationEnabled ? 'Activo' : 'Inactivo'}
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {settings.monetizationEnabled 
                    ? '✅ Sistema de cobros habilitado. Los usuarios requieren suscripción activa.' 
                    : '⚪ Modo gratuito. Todos los usuarios tienen acceso completo sin restricciones.'}
                </p>
              </div>

              {/* Días de acceso gratuito */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Período de prueba gratuito (días)
                </label>
                <input
                  type="number"
                  value={settings.freeAccessDays}
                  onChange={(e) => setSettings({ ...settings, freeAccessDays: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Nuevos usuarios tendrán acceso gratuito durante este período
                </p>
              </div>

              {/* Moneda */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Moneda</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Planes de Suscripción */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Planes de Suscripción</h2>

            <div className="space-y-6">
              {/* Plan Free */}
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-800">🆓 Plan Free</h3>
                  <span className="text-2xl font-bold text-gray-600">0.00 {settings.currency}</span>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ Acceso limitado a cuestionarios</li>
                  <li>✓ Foro de estudiantes</li>
                  <li>✗ Sin estadísticas avanzadas</li>
                </ul>
              </div>

              {/* Plan Basic */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-blue-800">📘 Plan Basic</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.basicPrice}
                      onChange={(e) => setSettings({ ...settings, basicPrice: parseFloat(e.target.value) })}
                      className="w-24 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-sm text-blue-600">{settings.currency}/mes</span>
                  </div>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Acceso ilimitado a cuestionarios</li>
                  <li>✓ Estadísticas personales</li>
                  <li>✓ Foro premium</li>
                </ul>
              </div>

              {/* Plan Premium */}
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-purple-800">👑 Plan Premium</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={settings.premiumPrice}
                      onChange={(e) => setSettings({ ...settings, premiumPrice: parseFloat(e.target.value) })}
                      className="w-24 px-3 py-2 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                    <span className="text-sm text-purple-600">{settings.currency}/mes</span>
                  </div>
                </div>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>✓ Todo de Basic</li>
                  <li>✓ Simulacros cronometrados</li>
                  <li>✓ Análisis de errores repetidos</li>
                  <li>✓ Soporte prioritario</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : '💾 Guardar Configuración'}
          </button>
        </div>

        {/* Lista de Suscripciones */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Suscripciones Activas</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuario</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Próxima Renovación</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{sub.user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        sub.plan === 'premium' 
                          ? 'bg-purple-100 text-purple-700'
                          : sub.plan === 'basic'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {sub.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        sub.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {sub.status === 'active' ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {sub.currentPeriodEnd 
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')
                        : '-'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <select
                        onChange={(e) => {
                          const [plan, status] = e.target.value.split('|')
                          handleUpdateSubscription(sub.userId, { plan, status })
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Cambiar...</option>
                        <option value="free|active">Free</option>
                        <option value="basic|active">Basic</option>
                        <option value="premium|active">Premium</option>
                        <option value={`${sub.plan}|cancelled`}>Cancelar</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay suscripciones registradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
