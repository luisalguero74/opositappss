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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo con imagen */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.9)'
        }}
      />
      
      {/* Overlay con gradiente */}
      <div 
        className="fixed inset-0 z-[1]"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.45) 0%, rgba(79, 70, 229, 0.35) 50%, rgba(139, 92, 246, 0.45) 100%)'
        }}
      />

      {/* Badge institucional */}
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-[11] bg-white/15 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-full text-white text-xs md:text-sm font-bold uppercase tracking-wider shadow-lg">
        Preparación Oficial de Oposiciones
      </div>

      {/* Círculos decorativos */}
      <div className="fixed top-[10%] left-[5%] w-24 h-24 md:w-32 md:h-32 border-[3px] border-white/20 rounded-full z-[3] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[15%] right-[8%] w-32 h-32 md:w-40 md:h-40 border-[3px] border-white/15 rounded-full z-[3] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

      {/* Tarjeta de login */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 via-blue-600 to-indigo-600 p-8 md:p-12 text-center relative overflow-hidden">
            {/* Patrón de fondo en header */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }} />
            
            <div className="relative z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full mx-auto mb-4 md:mb-6 flex items-center justify-center text-4xl md:text-5xl shadow-xl">
                📚
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg">Iniciar Sesión</h1>
              <p className="text-blue-100 text-sm md:text-base">Accede a tu cuenta en opositAPPSS</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-10 bg-white">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
                {success}
              </div>
            )}
            
            <div className="mb-5">
              <label className="block text-gray-800 font-semibold mb-2 text-sm md:text-base">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 md:py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-800 font-semibold mb-2 text-sm md:text-base">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 md:py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 md:py-4 rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg shadow-lg"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="w-full mt-3 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:border-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-all disabled:opacity-50 text-sm md:text-base"
            >
              {resendLoading ? 'Enviando...' : 'Reenviar verificación'}
            </button>
          </form>
          
          <div className="px-6 md:px-10 pb-8 text-center border-t border-gray-200">
            <p className="text-gray-600 mt-6 text-sm md:text-base">
              ¿No tienes cuenta?{' '}
              <a href="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
                Regístrate aquí
              </a>
            </p>
            <p className="text-gray-500 mt-3 text-xs md:text-sm">
              ¿Eres admin y no recuerdas la contraseña?{' '}
              <a href="/admin/recover-password" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
                Recuperar acceso
              </a>
            </p>
          </div>
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
