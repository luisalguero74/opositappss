'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '../../src/components/Logo'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setSuccess('Email verificado exitosamente. Ahora puedes iniciar sesión.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    })
    setLoading(false)
    if (result?.error) {
      if (result.error === 'EMAIL_NOT_VERIFIED') {
        setError('Debes verificar tu email antes de iniciar sesión.')
      } else {
        setError('Credenciales inválidas')
      }
    } else {
      router.push('/dashboard')
    }
  }

  const handleResendVerification = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Introduce tu email para reenviar la verificación.')
      return
    }

    setResendLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(String((data as any)?.error || 'No se pudo reenviar la verificación.'))
        return
      }
      setSuccess(String((data as any)?.message || 'Si el email existe, hemos enviado un enlace de verificación.'))
    } catch {
      setError('No se pudo reenviar la verificación.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <Logo variant="white" />
          <h1 className="text-3xl font-bold text-white mt-4">Iniciar Sesión</h1>
          <p className="text-blue-100 mt-2">Accede a tu cuenta en opositAPPSS</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
          >
            {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full mt-3 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:border-indigo-500 hover:text-indigo-700 transition disabled:opacity-50"
          >
            {resendLoading ? 'Enviando...' : 'Reenviar verificación'}
          </button>
        </form>
        <div className="px-8 pb-8 text-center border-t border-gray-200">
          <p className="text-gray-600 mt-4">
            ¿No tienes cuenta?{' '}
            <a href="/register" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Regístrate aquí
            </a>
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            ¿Eres admin y no recuerdas la contraseña?{' '}
            <a href="/admin/recover-password" className="text-indigo-600 font-semibold hover:text-indigo-700">
              Recuperar acceso
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
