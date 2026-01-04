'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SystemError {
  id: string
  errorType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  endpoint?: string
  statusCode?: number
  message: string
  userEmail?: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}

interface ErrorStats {
  totalErrors: number
  unresolvedCount: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  timeRange: string
}

export default function ErrorMonitoringPage() {
  const [errors, setErrors] = useState<SystemError[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  useEffect(() => {
    fetchErrors()
  }, [filter, severityFilter])

  const fetchErrors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter === 'unresolved') params.append('resolved', 'false')
      if (severityFilter !== 'all') params.append('severity', severityFilter)

      const res = await fetch(`/api/admin/errors?${params.toString()}`)
      const data = await res.json()
      setErrors(data.errors || [])
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching errors:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveError = async (errorId: string) => {
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId, resolved: true })
      })

      if (res.ok) {
        setErrors(errors.filter(e => e.id !== errorId))
      }
    } catch (err) {
      console.error('Error resolving error:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴'
      case 'high':
        return '🟠'
      case 'medium':
        return '🟡'
      case 'low':
        return '🔵'
      default:
        return '⚪'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
                🔍 Monitoreo de Errores del Sistema
              </h1>
              <p className="text-slate-400 text-sm md:text-base">
                Panel de control para detectar y resolver problemas en tiempo real
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-center"
            >
              ← Volver al Admin
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="bg-slate-700 p-4 md:p-6 rounded-lg border border-slate-600">
              <p className="text-slate-300 text-xs md:text-sm mb-2">Total de Errores</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats.totalErrors}</p>
              <p className="text-xs text-slate-400 mt-2">Últimos 7 días</p>
            </div>

            <div className="bg-red-900 p-4 md:p-6 rounded-lg border border-red-700">
              <p className="text-red-200 text-xs md:text-sm mb-2">Sin Resolver</p>
              <p className="text-2xl md:text-3xl font-bold text-red-100">{stats.unresolvedCount}</p>
              <p className="text-xs text-red-300 mt-2">Requieren atención</p>
            </div>

            <div className="bg-slate-700 p-4 md:p-6 rounded-lg border border-slate-600">
              <p className="text-slate-300 text-xs md:text-sm mb-2">Críticos</p>
              <p className="text-2xl md:text-3xl font-bold text-orange-400">
                {stats.bySeverity?.critical || 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">Máxima prioridad</p>
            </div>

            <div className="bg-slate-700 p-4 md:p-6 rounded-lg border border-slate-600">
              <p className="text-slate-300 text-xs md:text-sm mb-2">Altos</p>
              <p className="text-2xl md:text-3xl font-bold text-yellow-400">
                {stats.bySeverity?.high || 0}
              </p>
              <p className="text-xs text-slate-400 mt-2">Alta prioridad</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-700 p-4 md:p-6 rounded-lg border border-slate-600 mb-6 md:mb-8">
          <h3 className="text-white font-semibold mb-4 text-sm md:text-base">Filtros</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-slate-300 text-xs md:text-sm block mb-2">Estado</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved')}
                className="bg-slate-600 text-white px-3 md:px-4 py-2 rounded border border-slate-500 w-full text-sm md:text-base"
              >
                <option value="unresolved">Sin Resolver</option>
                <option value="all">Todos</option>
              </select>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-slate-300 text-xs md:text-sm block mb-2">Severidad</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-600 text-white px-3 md:px-4 py-2 rounded border border-slate-500 w-full text-sm md:text-base"
              >
                <option value="all">Todas</option>
                <option value="critical">🔴 Crítica</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🔵 Baja</option>
              </select>
            </div>

            <button
              onClick={fetchErrors}
              className="sm:self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm md:text-base whitespace-nowrap"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Errors List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Cargando errores...</p>
            </div>
          ) : errors.length === 0 ? (
            <div className="bg-green-900 border border-green-700 p-6 rounded-lg text-center">
              <p className="text-green-100 text-base md:text-lg font-semibold">✅ ¡Sin errores críticos!</p>
              <p className="text-green-300 text-sm mt-2">El sistema está funcionando correctamente</p>
            </div>
          ) : (
            errors.map((error) => (
              <div
                key={error.id}
                className={`p-4 md:p-6 rounded-lg border ${getSeverityColor(error.severity)} bg-opacity-10`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1">
                    <span className="text-xl md:text-2xl mt-1">{getSeverityEmoji(error.severity)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base md:text-lg font-semibold text-white break-words">
                          {error.errorType}
                        </h3>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(error.severity)}`}>
                          {error.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-white mb-3 text-sm md:text-base break-words">{error.message}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
                        {error.endpoint && (
                          <div>
                            <span className="text-slate-300">Endpoint:</span>
                            <p className="text-white font-mono break-all">{error.endpoint}</p>
                          </div>
                        )}
                        {error.statusCode && (
                          <div>
                            <span className="text-slate-300">Status Code:</span>
                            <p className="text-white font-bold">{error.statusCode}</p>
                          </div>
                        )}
                        {error.userEmail && (
                          <div>
                            <span className="text-slate-300">Usuario:</span>
                            <p className="text-white break-all">{error.userEmail}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-300">Timestamp:</span>
                          <p className="text-white text-xs md:text-sm">{new Date(error.createdAt).toLocaleString('es-ES')}</p>
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2">
                    {!error.resolved && (
                      <button
                        onClick={() => handleResolveError(error.id)}
                        className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition whitespace-nowrap text-sm md:text-base"
                      >
                        ✓ Resolver
                      </button>
                    )}
                    {error.resolved && (
                      <span className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-green-900 text-green-100 rounded text-xs md:text-sm text-center">
                        ✓ Resuelto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error Types Distribution */}
        {stats && Object.keys(stats.byType).length > 0 && (
          <div className="mt-6 md:mt-8 bg-slate-700 p-4 md:p-6 rounded-lg border border-slate-600">
            <h3 className="text-white font-semibold mb-4 text-sm md:text-base">Distribución de Tipos de Error</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-slate-300 text-xs md:text-sm min-w-[120px]">{type}</span>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-full sm:w-48 bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full"
                        style={{
                          width: `${(count / stats.totalErrors) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-12 text-right text-sm md:text-base">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
