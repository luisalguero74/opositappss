'use client'

import { useState } from 'react'
import Link from 'next/link'
import Logo from '../../../src/components/Logo'

export default function AdminRecoverPasswordPage() {
  const [email, setEmail] = useState('alguero2@yahoo.com')
  const [apiKey, setApiKey] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!email.trim() || !apiKey.trim() || !newPassword || !confirmNewPassword) {
      setMessage({ type: 'error', text: 'Completa todos los campos.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, apiKey, newPassword, confirmNewPassword })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = Array.isArray(data?.details) ? data.details.join(' ') : ''
        setMessage({
          type: 'error',
          text: String(data?.error || 'Error') + (details ? ` ${details}` : '')
        })
        return
      }

      setMessage({ type: 'success', text: 'Contraseña actualizada. Ya puedes iniciar sesión.' })
      setApiKey('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Error de conexión.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
        <div className="bg-gradient-to-r from-slate-700 to-gray-900 p-8 text-center">
          <Logo variant="white" />
          <h1 className="text-2xl font-bold text-white mt-4">Recuperación Admin</h1>
          <p className="text-slate-200 mt-2 text-sm">Requiere la clave de administrador (ADMIN_API_KEY)</p>
        </div>

        <form onSubmit={onSubmit} className="p-8">
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

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Email admin</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Clave de admin (ADMIN_API_KEY)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500 mt-1">Mín. 8 caracteres, con mayúscula, minúscula, número y carácter especial</p>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Confirmar nueva contraseña</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-slate-700 to-gray-900 text-white font-bold py-3 rounded-lg hover:from-slate-800 hover:to-black transition disabled:opacity-50"
          >
            {loading ? 'Actualizando…' : 'Actualizar contraseña'}
          </button>
        </form>

        <div className="px-8 pb-8 text-center border-t border-gray-200">
          <p className="text-gray-600 mt-4">
            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
