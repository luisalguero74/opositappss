'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UserMenu from '@/components/UserMenu'

interface CronJob {
  id: string
  name: string
  path: string
  defaultSchedule: string
  schedule: string
  description: string
  enabled: boolean
}

interface CronStats {
  totalExecutions?: number
  lastExecution?: string
  estimatedCost?: number
}

export default function CronManager() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [crons, setCrons] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [hasActiveCrons, setHasActiveCrons] = useState(false)

  useEffect(() => {
    if (session && session.user && session.user.role?.toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    loadCronConfig()
  }, [])

  const loadCronConfig = async () => {
    try {
      const res = await fetch('/api/admin/cron-config')
      if (!res.ok) throw new Error('Error al cargar configuración')
      
      const data = await res.json()
      setCrons(data.crons || [])
      setHasActiveCrons(data.hasActiveCrons || false)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al cargar configuración' 
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleCron = async (cronId: string, enabled: boolean, schedule: string) => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      const res = await fetch('/api/admin/cron-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronId, enabled, schedule })
      })

      if (!res.ok) throw new Error('Error al actualizar configuración')

      const data = await res.json()
      setMessage({ 
        type: 'success', 
        text: data.message 
      })
      
      // Recargar configuración
      await loadCronConfig()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al guardar cambios' 
      })
    } finally {
      setSaving(false)
    }
  }

  const saveAllCrons = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      const res = await fetch('/api/admin/cron-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crons })
      })

      if (!res.ok) throw new Error('Error al guardar configuración')

      const data = await res.json()
      setMessage({ 
        type: 'success', 
        text: data.message + ' ⚠️ Requiere deployment para aplicar cambios.' 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al guardar cambios' 
      })
    } finally {
      setSaving(false)
    }
  }

  const updateCronSchedule = (cronId: string, schedule: string) => {
    setCrons(prev => prev.map(c => 
      c.id === cronId ? { ...c, schedule } : c
    ))
  }

  const updateCronEnabled = (cronId: string, enabled: boolean) => {
    setCrons(prev => prev.map(c => 
      c.id === cronId ? { ...c, enabled } : c
    ))
  }

  if (!session || !session.user || session.user.role?.toLowerCase() !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">No autorizado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>⏰</span> Gestión de Cron Jobs
              </h1>
              <p className="text-blue-100 text-sm mt-1">Configura la generación automática de preguntas</p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-white hover:text-blue-100 text-sm font-medium transition">
                ← Panel Admin
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Mensajes */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-800' 
                : 'bg-red-100 border border-red-400 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* Advertencia sobre consumo */}
          {hasActiveCrons && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <div className="text-3xl mr-3">⚠️</div>
                <div>
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">Consumo de Recursos Activo</h3>
                  <p className="text-yellow-800 text-sm mb-2">
                    Tienes cron jobs activos que consumen recursos de Vercel y Supabase:
                  </p>
                  <ul className="text-yellow-800 text-sm list-disc list-inside space-y-1">
                    <li><strong>Vercel:</strong> Ejecuciones de funciones serverless</li>
                    <li><strong>Supabase:</strong> Egress (transferencia de datos)</li>
                    <li><strong>Groq/OpenAI:</strong> Tokens de IA para generar preguntas</li>
                  </ul>
                  <p className="text-yellow-800 text-sm mt-2 font-semibold">
                    💡 Recomendación: Desactiva los crons si no los necesitas o reduce su frecuencia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info: Optimizaciones aplicadas */}
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="text-3xl mr-3">✅</div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Optimizaciones Aplicadas</h3>
                <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
                  <li>Solo carga las últimas 100 preguntas por tema (antes: todas)</li>
                  <li>Usa índices optimizados en la base de datos</li>
                  <li>Reduce el tamaño del prompt enviado a IA</li>
                  <li>Detecta duplicados con búsqueda incremental</li>
                </ul>
                <p className="text-blue-800 text-sm mt-2">
                  <strong>Reducción estimada:</strong> ~80% menos egress de Supabase
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Cron Jobs */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
              <h2 className="text-xl font-bold text-white">Configuración de Cron Jobs</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-gray-600">Cargando configuración...</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-6">
                  {crons.map((cron) => (
                    <div key={cron.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{cron.name}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              cron.enabled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {cron.enabled ? '✓ Activo' : '○ Inactivo'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{cron.description}</p>
                          <p className="text-xs text-gray-500">
                            <strong>Endpoint:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{cron.path}</code>
                          </p>
                        </div>
                        
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cron.enabled}
                            onChange={(e) => {
                              const enabled = e.target.checked
                              updateCronEnabled(cron.id, enabled)
                              toggleCron(cron.id, enabled, cron.schedule)
                            }}
                            disabled={saving}
                            className="sr-only peer"
                          />
                          <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                      </div>

                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Schedule (Cron Expression)
                          </label>
                          <input
                            type="text"
                            value={cron.schedule}
                            onChange={(e) => updateCronSchedule(cron.id, e.target.value)}
                            disabled={!cron.enabled || saving}
                            placeholder="0 2 * * *"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Por defecto: <code className="bg-gray-100 px-1 rounded">{cron.defaultSchedule}</code>
                          </p>
                        </div>
                        
                        <button
                          onClick={() => toggleCron(cron.id, cron.enabled, cron.schedule)}
                          disabled={saving}
                          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Aplicar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={saveAllCrons}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Guardando...' : '💾 Guardar Toda la Configuración'}
                  </button>
                  
                  <button
                    onClick={loadCronConfig}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Recargar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guía de Cron Expressions */}
          <div className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h2 className="text-xl font-bold text-white">📚 Guía de Cron Expressions</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Las expresiones cron definen cuándo se ejecutan los jobs automáticamente. Formato: <code className="bg-gray-100 px-2 py-1 rounded">minuto hora día mes día-semana</code>
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">Ejemplos Comunes:</h4>
                  <ul className="space-y-2 text-sm">
                    <li><code className="bg-white px-2 py-1 rounded">0 2 * * *</code> - Diario a las 2:00 AM</li>
                    <li><code className="bg-white px-2 py-1 rounded">0 4 * * 1</code> - Lunes a las 4:00 AM</li>
                    <li><code className="bg-white px-2 py-1 rounded">0 3 1 * *</code> - Día 1 de cada mes a las 3:00 AM</li>
                    <li><code className="bg-white px-2 py-1 rounded">0 0 * * 0</code> - Domingos a medianoche</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-2">Recomendaciones:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>✅ <strong>Uso ligero:</strong> Solo 1 cron, ejecución semanal</li>
                    <li>⚠️ <strong>Uso moderado:</strong> 2 crons, ejecuciones semanales</li>
                    <li>❌ <strong>Alto consumo:</strong> Múltiples crons diarios</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Info sobre deployment */}
          <div className="mt-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="text-3xl mr-3">🚀</div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Aplicar Cambios</h3>
                <p className="text-amber-800 text-sm mb-2">
                  Los cambios en los cron jobs requieren un <strong>deployment en Vercel</strong> para aplicarse.
                </p>
                <ol className="text-amber-800 text-sm list-decimal list-inside space-y-1">
                  <li>Guarda la configuración aquí</li>
                  <li>Haz commit y push del archivo <code className="bg-amber-100 px-1 rounded">vercel.json</code></li>
                  <li>Vercel desplegará automáticamente con la nueva configuración</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
