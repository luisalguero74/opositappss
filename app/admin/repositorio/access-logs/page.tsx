'use client'

import type { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AccessLogEntry {
  id: string
  documentId: string
  userId: string | null
  action: 'view' | 'preview' | 'download' | string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  documentTitle: string | null
  userEmail: string | null
}

export default function RepoAccessLogsPage() {
  const { data: session, status } = useSession() as {
    data: Session | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
  }
  const router = useRouter()

  const [logs, setLogs] = useState<AccessLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/repositorio/access-logs')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const role = String(session?.user?.role || '').toLowerCase()
    if (role !== 'admin') return

    let cancelled = false
    const fetchLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/repositorio/access-logs')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || 'Error al cargar logs')
        }
        if (cancelled) return
        setLogs((data?.logs || []) as AccessLogEntry[])
      } catch (err: any) {
        if (cancelled) return
        setError(err?.message || 'Error desconocido')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }

    fetchLogs()
    return () => {
      cancelled = true
    }
  }, [status, session])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando logs de acceso...</p>
      </div>
    )
  }

  const role = String(session.user?.role || '').toLowerCase()
  if (role !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link
            href="/admin/repositorio"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Volver a Administración del repositorio
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Logs de acceso al repositorio</h1>
          <p className="mt-1 text-sm text-slate-600">Trazabilidad de visualizaciones y descargas.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Cargando...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No hay logs todavía.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Acción</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Documento</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">IP</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">User-Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.userEmail || log.userId || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ' +
                            (log.action === 'download'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.action === 'preview'
                                ? 'bg-sky-50 text-sky-700'
                                : 'bg-slate-100 text-slate-700')
                          }
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.documentTitle || log.documentId}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{log.ipAddress || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[28rem] truncate">{log.userAgent || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
