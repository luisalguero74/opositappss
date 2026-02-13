'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminTestEmailPage() {
  const { data: session, status } = useSession() as { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' }
  const router = useRouter()

  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && String(session?.user?.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!to.trim()) {
      setMessage({ type: 'error', text: 'Introduce un email destino.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to })
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMessage({ type: 'error', text: String(data?.error || 'Error enviando email') })
        return
      }

      setMessage({ type: 'success', text: 'Email enviado (si no llega, revisa spam/promociones).' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Error de conexión.' })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-xl">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800">
          ← Volver a Administración
        </Link>

        <div className="bg-white p-6 rounded-lg shadow mt-4">
          <h1 className="text-2xl font-bold mb-2">Enviar email de prueba</h1>
          <p className="text-gray-600 mb-4">
            Envía un correo usando Resend (requiere <code>RESEND_API_KEY</code> y <code>EMAIL_FROM</code> en Vercel).
          </p>

          {message && (
            <div
              className={`border px-4 py-3 rounded-lg mb-4 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Destino</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
                placeholder="tuemail@ejemplo.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-700 to-gray-900 text-white font-bold py-3 rounded-lg hover:from-slate-800 hover:to-black transition disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar email de prueba'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            Consejo: revisa “Promociones” o “Spam” la primera vez.
          </p>
        </div>
      </div>
    </div>
  )
}
