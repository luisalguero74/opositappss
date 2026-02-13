'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ContactLead {
  id: string
  name: string | null
  email: string
  phone: string
  note: string | null
  source: string | null
  createdAt: string
}

export default function AdminContactLeadsPage() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [leads, setLeads] = useState<ContactLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session && session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/contact-leads?limit=1000')
        if (!res.ok) {
          throw new Error('Error al cargar los registros')
        }
        const data = await res.json()
        setLeads(data.leads || [])
      } catch (err: any) {
        console.error('Error fetching contact leads:', err)
        setError('No se pudieron cargar los registros. Inténtalo de nuevo más tarde.')
      } finally {
        setLoading(false)
      }
    }

    if (session && session.user && String(session.user.role || '').toLowerCase() === 'admin') {
      fetchLeads()
    }
  }, [session])

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  const handleExportCsv = () => {
    if (!leads.length) return

    const headers = ['Nombre', 'Email', 'Telefono', 'Nota', 'Origen', 'FechaHora']
    const rows = leads.map((lead) => [
      lead.name || '',
      lead.email,
      lead.phone,
      lead.note || '',
      lead.source || '',
      new Date(lead.createdAt).toLocaleString('es-ES'),
    ])

    const csvLines = [
      headers.join(';'),
      ...rows.map((r) =>
        r
          .map((value) => {
            const v = value == null ? '' : String(value)
            if (v.includes(';') || v.includes('"') || v.includes('\n')) {
              return '"' + v.replace(/"/g, '""') + '"'
            }
            return v
          })
          .join(';')
      ),
    ]

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const now = new Date()
    const stamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      '-' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0')

    a.href = url
    a.download = `contact-leads-${stamp}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block"
          >
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-2xl flex items-center justify-between gap-4">
            <div>
              <div className="text-4xl mb-2">📇</div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Emails y Teléfonos (Formulario Externo)
              </h1>
              <p className="text-blue-100 mt-1 text-sm md:text-base">
                Registros enviados desde el formulario compartido (por ejemplo, grupos de WhatsApp).
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={!leads.length}
              className="px-4 py-2 rounded-xl bg-white/95 text-blue-700 font-semibold text-xs md:text-sm shadow-md hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-4 md:p-6">
          {loading ? (
            <p className="text-slate-500 text-sm">Cargando registros...</p>
          ) : error ? (
            <p className="text-red-500 text-sm">{error}</p>
          ) : !leads.length ? (
            <p className="text-slate-500 text-sm">
              Todavía no hay registros en la tabla ContactLead. Cuando los usuarios completen el
              formulario externo, aparecerán aquí.
            </p>
          ) : (
            <div className="overflow-auto max-h-[70vh] rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Nombre
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Teléfono
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Nota
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Origen
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Fecha / Hora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr
                      key={lead.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {String(leads.length - index).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-sm max-w-[160px] truncate">
                        {lead.name || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-sm max-w-[200px] truncate">
                        {lead.email}
                      </td>
                      <td className="px-3 py-2 text-slate-800 text-sm whitespace-nowrap">
                        {lead.phone}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs max-w-[220px] truncate">
                        {lead.note || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs max-w-[140px] truncate">
                        {lead.source || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-xs whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleString('es-ES')}
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
