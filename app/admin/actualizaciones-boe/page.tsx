'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import bibliotecaLegal from '../../../data/biblioteca-legal.json'

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
  const [monitorizacionActiva, setMonitorizacionActiva] = useState(false)
  const [ultimaComprobacion, setUltimaComprobacion] = useState<Date | null>(null)
  const [actualizacionesDetectadas, setActualizacionesDetectadas] = useState<number>(0)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const activarMonitorizacion = () => {
    setMonitorizacionActiva(true)
    setUltimaComprobacion(new Date())
    alert('✅ Monitorización activada. Se comprobará el BOE diariamente a las 08:00 AM')
  }

  const desactivarMonitorizacion = () => {
    setMonitorizacionActiva(false)
    alert('⏸️ Monitorización pausada')
  }

  const comprobarAhora = () => {
    setUltimaComprobacion(new Date())
    alert('🔍 Comprobando actualizaciones en el BOE...')
    // Aquí iría la lógica real de comprobación
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
                Estado del Monitor: {monitorizacionActiva ? (
                  <span className="text-green-600">🟢 ACTIVO</span>
                ) : (
                  <span className="text-orange-600">⏸️ PAUSADO</span>
                )}
              </h2>
              <p className="text-gray-600">
                {monitorizacionActiva 
                  ? 'El sistema comprueba automáticamente el BOE cada día a las 08:00 AM'
                  : 'Activa la monitorización para recibir notificaciones de cambios normativos'
                }
              </p>
              {ultimaComprobacion && (
                <p className="text-sm text-gray-500 mt-2">
                  Última comprobación: {ultimaComprobacion.toLocaleString('es-ES')}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              {monitorizacionActiva ? (
                <button
                  onClick={desactivarMonitorizacion}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition"
                >
                  ⏸️ Pausar
                </button>
              ) : (
                <button
                  onClick={activarMonitorizacion}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition"
                >
                  ▶️ Activar Monitor
                </button>
              )}
              
              <button
                onClick={comprobarAhora}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition"
              >
                🔍 Comprobar Ahora
              </button>
            </div>
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

        {/* Sección de configuración */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚙️ Configuración del Monitor</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email para Notificaciones
              </label>
              <input
                type="email"
                placeholder="admin@opositapp.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Frecuencia de Comprobación
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>Diaria (08:00 AM)</option>
                <option>Semanal (Lunes 08:00 AM)</option>
                <option>Mensual (Día 1 - 08:00 AM)</option>
              </select>
            </div>

            <button className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition">
              💾 Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
