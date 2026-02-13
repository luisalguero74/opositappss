'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from 'next-auth'

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId?: string
  adminEmail: string
  changes?: string
  reason?: string
  createdAt: string
}

export default function AdminAuditLogs() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (session && session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/audit-logs?filter=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800'
      case 'UPDATE':
        return 'bg-yellow-100 text-yellow-800'
      case 'DELETE':
        return 'bg-red-100 text-red-800'
      case 'LOGIN':
        return 'bg-blue-100 text-blue-800'
      case 'EXPORT':
        return 'bg-purple-100 text-purple-800'
      case 'BACKUP':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return '✅'
      case 'UPDATE':
        return '✏️'
      case 'DELETE':
        return '🗑️'
      case 'LOGIN':
        return '🔐'
      case 'EXPORT':
        return '📤'
      case 'BACKUP':
        return '💾'
      default:
        return '📝'
    }
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-slate-700 to-gray-900 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl mb-3">🔍</div>
                <h1 className="text-4xl font-bold text-white">Registro de Auditoría</h1>
                <p className="text-gray-300 mt-2">Historial completo de acciones administrativas</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold"
                >
                  <option value="all">Todas las acciones</option>
                  <option value="CREATE">Creaciones</option>
                  <option value="UPDATE">Actualizaciones</option>
                  <option value="DELETE">Eliminaciones</option>
                  <option value="LOGIN">Inicios de sesión</option>
                  <option value="EXPORT">Exportaciones</option>
                  <option value="BACKUP">Backups</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            <p className="mt-4 text-gray-600">Cargando logs...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detalles
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No hay registros de auditoría
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('es-ES') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                            <span>{getActionIcon(log.action)}</span>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.entity}
                          {log.entityId && (
                            <span className="ml-2 text-xs text-gray-500">#{log.entityId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.adminEmail}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {log.reason || log.changes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
