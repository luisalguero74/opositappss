'use client'

import type { Session } from 'next-auth'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type RepoRole = 'NONE' | 'READER' | 'EDITOR' | string

type RepoAccessRequestAdmin = {
  id: string
  desiredRole: 'READER' | 'EDITOR' | string
  status: 'PENDING' | 'APPROVED' | 'DENIED' | string
  createdAt: string
  user: {
    id: string
    email: string | null
    phoneNumber: string | null
    repoRole: RepoRole
  }
}

export default function RepoAccessRequestsAdminPage() {
  const { data: session, status } = useSession() as {
    data: Session | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
  }
  const router = useRouter()

  const [requests, setRequests] = useState<RepoAccessRequestAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const isAdmin = useMemo(() => {
    const role = String(session?.user?.role || '').toLowerCase()
    return role === 'admin'
  }, [session])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/repositorio/access-requests')
    }
  }, [status, router])

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/repositorio/access-requests')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Error al cargar solicitudes')
      }
      setRequests((data?.requests || []) as RepoAccessRequestAdmin[])
    } catch (err: any) {
      setError(err?.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!isAdmin) return

    let cancelled = false
    const run = async () => {
      await fetchRequests()
    }

    run()
    return () => {
      cancelled = true
      void cancelled
    }
  }, [status, isAdmin])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando solicitudes...</p>
      </div>
    )
  }

  if (!isAdmin) {
    router.replace('/dashboard')
    return null
  }

  const handleAction = async (requestId: string, action: 'approve' | 'deny') => {
    setActingId(requestId)
    setError(null)
    try {
      const res = await fetch('/api/admin/repositorio/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo procesar la solicitud')
      }
      await fetchRequests()
    } catch (err: any) {
      setError(err?.message || 'Error desconocido')
    } finally {
      setActingId(null)
    }
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
          <h1 className="mt-2 text-xl font-bold text-slate-900">Solicitudes de acceso al repositorio</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aprueba o deniega peticiones pendientes. Si se deniega, el usuario se queda como lector.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-600">Cargando...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No hay solicitudes pendientes.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Teléfono</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Rol actual</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Solicita</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.user.email || r.user.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.user.phoneNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-semibold">
                          {String(r.user.repoRole || '—')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-semibold">
                          {String(r.desiredRole)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                            onClick={() => handleAction(r.id, 'approve')}
                            disabled={actingId === r.id}
                          >
                            Aprobar
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            onClick={() => handleAction(r.id, 'deny')}
                            disabled={actingId === r.id}
                          >
                            Denegar
                          </button>
                        </div>
                      </td>
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
