'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import bibliotecaLegal from '../../../data/biblioteca-legal.json'

type BoeAlertItemDto = {
  id: string
  publicationDate: string
  boeId: string | null
  title: string
  urlHtml: string
  urlPdf: string | null
  section: string | null
  department: string | null
  epigrafe: string | null
  score: number
  reasons: string | null
  isRead: boolean
  createdAt: string
}

type BoeAlertsResponse = {
  unreadCount: number
  lastRun:
    | null
    | {
        createdAt: string
        publicationDate: string
        success: boolean
        scannedItems: number
        matchedItems: number
        newItems: number
        error: string | null
      }
  items: BoeAlertItemDto[]
}

interface NormativaMonitorizada {
  id: string
  titulo: string
  referencia: string
  tipo: 'Constitución' | 'Ley' | 'RD' | 'Orden' | 'Reglamento'
  ultimaActualizacion: string
  temasAfectados: string[]
  urlBOE?: string
}

// Función para extraer referencia BOE del nombre del documento
function extractBOEReference(nombre: string): string | undefined {
  // Patrones comunes de referencias BOE
  const patterns = [
    /BOE-A-\d{4}-\d+/i,  // BOE-A-YYYY-NNNNN
    /ley\s+(\d+)\/(\d{4})/i,  // Ley XX/YYYY
    /rd[l]?\s+(\d+)\/(\d{4})/i,  // RD o RDL XX/YYYY
    /real decreto\s+(\d+)\/(\d{4})/i,
    /orden\s+(\w+)\/(\d+)/i
  ]
  
  for (const pattern of patterns) {
    const match = nombre.match(pattern)
    if (match) {
      return match[0]
    }
  }
  return undefined
}

// Función para determinar el tipo de normativa
function determinarTipo(nombre: string, tipo: string): NormativaMonitorizada['tipo'] {
  const nombreLower = nombre.toLowerCase()
  if (nombreLower.includes('constitucion') || nombreLower.includes('constitución')) return 'Constitución'
  if (nombreLower.includes('rd') || nombreLower.includes('real decreto') || nombreLower.includes('rdl')) return 'RD'
  if (nombreLower.includes('orden')) return 'Orden'
  if (nombreLower.includes('reglamento')) return 'Reglamento'
  return 'Ley'
}

// Función para generar URL del BOE basada en el nombre del documento
function generarURLBOE(nombre: string): string | undefined {
  const nombreLower = nombre.toLowerCase()
  
  // Mapeo de documentos conocidos a sus URLs del BOE
  const urlsConocidas: Record<string, string> = {
    'constitucion española 1978': 'https://www.boe.es/buscar/act.php?id=BOE-A-1978-31229',
    'ley 39/2015': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565',
    'ley 40/2015': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-10566',
    'rdl 8/2015': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11724',
    'ley 20 2007': 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-13409',
    'rd 84 1996': 'https://www.boe.es/buscar/act.php?id=BOE-A-1996-8745',
    'ley 19 2021': 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-9382',
    'ley 1 2000': 'https://www.boe.es/buscar/act.php?id=BOE-A-2000-323',
    'rdl 5 2000': 'https://www.boe.es/buscar/act.php?id=BOE-A-2000-15060',
    'ley 7 2007': 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-7788',
    'rd 1299 2006': 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-19487',
    'estatuto de los trabajadores': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430',
    'ley 27 1999': 'https://www.boe.es/buscar/act.php?id=BOE-A-1999-15681',
    'ley 42 2006': 'https://www.boe.es/buscar/act.php?id=BOE-A-2006-22949',
    'ley 47 2015': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11431',
    'rd 453 2022': 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-10541',
    'rd 1851 2009': 'https://www.boe.es/buscar/act.php?id=BOE-A-2009-20642',
    'rd 21 2021': 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-16115',
    'ley 50 1997': 'https://www.boe.es/buscar/act.php?id=BOE-A-1997-25364',
    'rd 2 2023': 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-7562',
    'ley 34 2014': 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328',
    'ley 23 2015': 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-8167'
  }
  
  // Buscar coincidencia en URLs conocidas
  for (const [clave, url] of Object.entries(urlsConocidas)) {
    if (nombreLower.includes(clave)) {
      return url
    }
  }
  
  return undefined
}

// Convertir documentos de biblioteca-legal.json a formato NormativaMonitorizada
const NORMATIVA_MONITORIZADA: NormativaMonitorizada[] = bibliotecaLegal.documentos.map((doc, index) => ({
  id: doc.id,
  titulo: doc.nombre,
  referencia: extractBOEReference(doc.nombre) || doc.nombre,
  tipo: determinarTipo(doc.nombre, doc.tipo),
  ultimaActualizacion: new Date(doc.fechaActualizacion).toLocaleDateString('es-ES'),
  temasAfectados: [], // Se puede mapear según el tipo de documento
  urlBOE: generarURLBOE(doc.nombre)
}))

export default function ActualizacionesBOE() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState<BoeAlertsResponse | null>(null)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && String(session.user.role || '').toLowerCase() !== 'admin')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const loadAlerts = async () => {
    setLoadingAlerts(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/boe/alerts', { cache: 'no-store' })
      const data = (await res.json()) as BoeAlertsResponse
      if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`)
      setAlerts(data)
    } catch (e: any) {
      setError(String(e?.message || e))
    } finally {
      setLoadingAlerts(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && String(session?.user?.role || '').toLowerCase() === 'admin') {
      loadAlerts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.role])

  const comprobarAhora = async () => {
    setRunningCheck(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/boe/run-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      await loadAlerts()
      alert(`✅ Comprobación completada. Nuevos: ${data.newItems} (Coincidencias: ${data.matchedItems})`)
    } catch (e: any) {
      setError(String(e?.message || e))
      alert(`❌ Error comprobando BOE: ${String(e?.message || e)}`)
    } finally {
      setRunningCheck(false)
    }
  }

  const setRead = async (ids: string[], isRead: boolean) => {
    if (ids.length === 0) return
    setError(null)
    try {
      const res = await fetch('/api/admin/boe/alerts/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, isRead })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`)
      await loadAlerts()
    } catch (e: any) {
      setError(String(e?.message || e))
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-red-600 hover:text-red-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📰🔔</div>
              <h1 className="text-4xl font-bold text-white">Monitor de Actualizaciones BOE</h1>
              <p className="text-red-100 mt-2">
                Monitorización automática de cambios en normativa legal desde el Boletín Oficial del Estado
              </p>
            </div>
          </div>
        </div>

        {/* Estado de monitorización */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Estado del Monitor: <span className="text-green-600">🟢 ACTIVO</span>
              </h2>
              <p className="text-gray-600">
                El sistema analiza el BOE completo diariamente (cron) y genera alertas para Seguridad Social.
              </p>
              {alerts?.lastRun?.createdAt && (
                <p className="text-sm text-gray-500 mt-2">
                  Última ejecución: {new Date(alerts.lastRun.createdAt).toLocaleString('es-ES')} (BOE {new Date(alerts.lastRun.publicationDate).toLocaleDateString('es-ES')})
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={comprobarAhora}
                disabled={runningCheck}
                className={`px-6 py-3 text-white font-bold rounded-lg transition ${
                  runningCheck ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {runningCheck ? '⏳ Comprobando...' : '🔍 Comprobar Ahora'}
              </button>

              <button
                onClick={loadAlerts}
                disabled={loadingAlerts}
                className={`px-6 py-3 text-white font-bold rounded-lg transition ${
                  loadingAlerts ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {loadingAlerts ? '⏳ Cargando...' : '🔄 Actualizar'}
              </button>
            </div>
          </div>
        </div>

        {/* Alertas Seguridad Social */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">🔔 Alertas BOE (Seguridad Social)</h2>
              <p className="text-gray-600 mt-1 text-sm">
                Se listan disposiciones detectadas automáticamente como potencialmente relevantes para Seguridad Social.
              </p>
              <p className="text-sm text-gray-700 mt-2">
                No leídas: <strong>{alerts?.unreadCount ?? '—'}</strong>
              </p>
              {error && (
                <p className="text-sm text-red-600 mt-2">
                  ❌ {error}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRead((alerts?.items || []).filter(i => !i.isRead).map(i => i.id), true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition text-sm"
              >
                ✅ Marcar todo como leído
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {(alerts?.items || []).length === 0 ? (
              <div className="text-sm text-gray-600 italic">No hay alertas todavía.</div>
            ) : (
              (alerts?.items || []).map(item => (
                <div
                  key={item.id}
                  className={`border rounded-xl p-4 ${item.isRead ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.isRead ? 'bg-gray-200 text-gray-700' : 'bg-blue-200 text-blue-800'}`}>
                          {item.isRead ? 'LEÍDO' : 'NUEVO'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                          Score: {item.score}
                        </span>
                        {item.boeId && (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-white text-gray-800 border border-gray-200">
                            {item.boeId}
                          </span>
                        )}
                        <span className="text-xs text-gray-600">
                          {new Date(item.publicationDate).toLocaleDateString('es-ES')}
                        </span>
                      </div>

                      <div className="font-bold text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {[item.section, item.department, item.epigrafe].filter(Boolean).join(' · ')}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <a
                          href={item.urlHtml}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:text-blue-800 font-semibold"
                        >
                          🔗 Ver en BOE.es →
                        </a>
                        {item.urlPdf && (
                          <a
                            href={item.urlPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-700 hover:text-gray-800 font-semibold"
                          >
                            📄 PDF →
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {item.isRead ? (
                        <button
                          onClick={() => setRead([item.id], false)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition text-sm"
                        >
                          ↩️ Marcar no leído
                        </button>
                      ) : (
                        <button
                          onClick={() => setRead([item.id], true)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition text-sm"
                        >
                          ✅ Marcar leído
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Información del sistema */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
          <h3 className="text-lg font-bold text-blue-900 mb-3">ℹ️ Cómo Funciona el Monitor</h3>
          <ul className="space-y-2 text-blue-800">
            <li>✅ <strong>Monitorización automática diaria</strong> del BOE a las 08:00 AM</li>
            <li>✅ <strong>Detecta cambios</strong> en las {NORMATIVA_MONITORIZADA.length} normativas clave del temario</li>
            <li>✅ <strong>Notificación por email</strong> al administrador cuando hay actualizaciones</li>
            <li>✅ <strong>Descarga automática</strong> del PDF oficial del BOE</li>
            <li>✅ <strong>Identifica temas afectados</strong> que deben revisarse</li>
            <li>⏸️ <strong>Pausado por defecto</strong> hasta completar la subida inicial del temario</li>
          </ul>
        </div>

        {/* Lista de normativa monitorizada */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Normativa Monitorizada ({NORMATIVA_MONITORIZADA.length} documentos)
          </h2>
        </div>

        <div className="space-y-4">
          {NORMATIVA_MONITORIZADA.map((norma) => (
            <div key={norma.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      norma.tipo === 'Constitución' ? 'bg-purple-100 text-purple-700' :
                      norma.tipo === 'Ley' ? 'bg-blue-100 text-blue-700' :
                      norma.tipo === 'RD' ? 'bg-green-100 text-green-700' :
                      norma.tipo === 'Orden' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {norma.tipo}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">{norma.titulo}</h3>
                  <p className="text-gray-600 mb-3">{norma.referencia}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>📅 Última actualización: <strong>{norma.ultimaActualizacion}</strong></span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📚 Temas Afectados:</p>
                    <div className="flex flex-wrap gap-2">
                      {norma.temasAfectados.length > 0 ? (
                        norma.temasAfectados.map((tema) => (
                          <span key={tema} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                            {tema}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 italic">Por determinar</span>
                      )}
                    </div>
                  </div>

                  {norma.urlBOE && (
                    <a
                      href={norma.urlBOE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-2"
                    >
                      🔗 Ver en BOE.es →
                    </a>
                  )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition text-sm">
                    📥 Descargar
                  </button>
                  <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition text-sm">
                    🔄 Comprobar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
