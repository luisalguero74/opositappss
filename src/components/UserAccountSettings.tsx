'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserData {
  id: string
  name: string
  email: string
  image?: string
  createdAt: string
  updatedAt: string
}

export default function UserAccountSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Estados
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  // Estados para perfil
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Estados para contraseña
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Cargar datos del usuario
  useEffect(() => {
    if (status !== 'authenticated') return

    const loadUserData = async () => {
      try {
        const res = await fetch('/api/user/account')
        if (res.ok) {
          const data = await res.json()
          setUserData(data)
          setName(data.name || '')
          setEmail(data.email || '')
        } else {
          console.error('Error loading user data:', res.status)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [status])

  // ===== HANDLERS =====

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)
    setProfileLoading(true)

    if (!name.trim()) {
      setProfileMessage({ type: 'error', text: 'El nombre es requerido' })
      setProfileLoading(false)
      return
    }

    try {
      const res = await fetch('/api/user/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateProfile',
          name,
          email,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setProfileMessage({ type: 'success', text: data.message })
        setUserData(data.user)
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Error al actualizar perfil' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setProfileMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    // Validaciones
    if (!currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual' })
      return
    }

    if (!newPassword) {
      setPasswordMessage({ type: 'error', text: 'Debes ingresar una nueva contraseña' })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }

    if (currentPassword === newPassword) {
      setPasswordMessage({ type: 'error', text: 'La nueva contraseña debe ser diferente' })
      return
    }

    setPasswordLoading(true)

    try {
      const res = await fetch('/api/user/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Error al cambiar contraseña' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando configuración de cuenta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <span className="mr-2">←</span> Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Cuenta</h1>
          <p className="text-gray-600 mt-1">Gestiona tu información personal y seguridad</p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                setActiveTab('profile')
                setProfileMessage(null)
              }}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'profile'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👤 Perfil
            </button>
            <button
              onClick={() => {
                setActiveTab('password')
                setPasswordMessage(null)
              }}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                activeTab === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔐 Contraseña
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* TAB: PERFIL */}
            {activeTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={profileLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={profileLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="tu@correo.com"
                  />
                </div>

                {userData && (
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    <p className="mb-1">
                      <span className="font-medium">Miembro desde:</span> {new Date(userData.createdAt).toLocaleDateString('es-ES')}
                    </p>
                    <p>
                      <span className="font-medium">Última actualización:</span> {new Date(userData.updatedAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                )}

                {profileMessage && (
                  <div
                    className={`p-4 rounded-lg ${
                      profileMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {profileMessage.type === 'success' ? '✓' : '✕'} {profileMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {profileLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            )}

            {/* TAB: CONTRASEÑA */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">🔒 Seguridad</p>
                  <p>Mantén tu contraseña segura. Usa una combinación de mayúsculas, minúsculas, números y símbolos.</p>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Tu contraseña actual"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {newPassword.length > 0 && (
                      <>
                        {newPassword.length < 8 ? '❌' : '✓'} Mínimo 8 caracteres
                      </>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={passwordLoading}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Repite la nueva contraseña"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {confirmPassword.length > 0 && (
                      <>
                        {newPassword === confirmPassword ? '✓' : '❌'} Las contraseñas coinciden
                      </>
                    )}
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Mostrar contraseñas</span>
                </label>

                {passwordMessage && (
                  <div
                    className={`p-4 rounded-lg ${
                      passwordMessage.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {passwordMessage.type === 'success' ? '✓' : '✕'} {passwordMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {passwordLoading ? 'Actualizando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>¿Necesitas ayuda? <Link href="/help" className="text-blue-600 hover:underline">Consulta nuestro centro de ayuda</Link></p>
        </div>
      </div>
    </div>
  )
}
