'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '../../src/components/Logo'

export default function Register() {
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [repoAccess, setRepoAccess] = useState<'app_only' | 'repo_reader' | 'repo_editor_request'>('app_only')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const validatePassword = (pwd: string) => {
    const minLength = pwd.length >= 8
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /\d/.test(pwd)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    return minLength && hasUpper && hasLower && hasNumber && hasSpecial
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validatePassword(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber, password, repoAccess })
      })

      if (response.ok) {
        setSuccess('Cuenta creada exitosamente. Revisa tu email para verificar tu cuenta.')
      } else {
        const data = await response.json()
        setError(data.error || 'Error al crear la cuenta.')
      }
    } catch (err) {
      setError('Error de conexión.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center">
          <Logo />
          <h1 className="text-3xl font-bold text-white mt-4">Crear Cuenta</h1>
          <p className="text-purple-100 mt-2">Únete a opositAPPSS hoy</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
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
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Número de Teléfono Móvil</label>
            <input
              type="tel"
              placeholder="+34 600 000 000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Formato: +34 seguido de 9 dígitos</p>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Mín. 8 caracteres, con mayúscula, minúscula, número y carácter especial</p>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Confirmar Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Acceso inicial</label>
            <div className="space-y-2 text-sm text-gray-700">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="repoAccess"
                  value="app_only"
                  checked={repoAccess === 'app_only'}
                  onChange={() => setRepoAccess('app_only')}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">Solo app</span>
                  <span className="block text-xs text-gray-500">No se mostrará el acceso al repositorio.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="repoAccess"
                  value="repo_reader"
                  checked={repoAccess === 'repo_reader'}
                  onChange={() => setRepoAccess('repo_reader')}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">App y repositorio (lector)</span>
                  <span className="block text-xs text-gray-500">Acceso de lectura al repositorio.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="repoAccess"
                  value="repo_editor_request"
                  checked={repoAccess === 'repo_editor_request'}
                  onChange={() => setRepoAccess('repo_editor_request')}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">App y repositorio (solicitar editor)</span>
                  <span className="block text-xs text-gray-500">
                    Acceso como lector y solicitud de editor pendiente de aprobación.
                  </span>
                </span>
              </label>
            </div>
          </div>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                required
                className="mt-1 h-3 w-3"
              />
              <span>
                Confirmo que he leído y acepto la{' '}
                <a href="/privacidad" className="text-purple-600 underline-offset-2 hover:underline font-semibold">
                  Política de privacidad
                </a>{' '}
                y el{' '}
                <a href="/aviso-legal" className="text-purple-600 underline-offset-2 hover:underline font-semibold">
                  Aviso legal
                </a>
                .
              </span>
            </label>
            <p className="text-[11px] text-gray-600">
              🔒 Tus datos personales serán tratados de acuerdo con el
              <strong> Reglamento General de Protección de Datos (RGPD) UE 2016/679</strong> y la
              <strong> Ley Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales</strong>,
              utilizándose únicamente para la gestión de tu cuenta y la prestación del servicio, sin compartirse con terceros
              salvo obligación legal o necesidad para la propia prestación.
            </p>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
            Crear Cuenta
          </button>
        </form>
        <div className="px-8 pb-8 text-center border-t border-gray-200">
          <p className="text-gray-600 mt-4">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-purple-600 font-semibold hover:text-purple-700">
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
