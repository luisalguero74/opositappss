'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '../../src/components/Logo'

export default function Register() {
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        body: JSON.stringify({ email, phoneNumber, password })
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
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Fondo de biblioteca */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1920&h=1080&fit=crop&q=80)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-red-900/80 backdrop-blur-sm"></div>
      </div>
      
      {/* Contenido */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md relative z-10">
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
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-700">
              🔒 Al registrarte, aceptas que tus datos personales serán tratados de acuerdo con el 
              <strong> Reglamento General de Protección de Datos (RGPD) UE 2016/679</strong> y la 
              <strong> Ley Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales</strong>. 
              Tus datos se utilizarán únicamente para la gestión de tu cuenta y no se compartirán con terceros sin tu consentimiento.
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
