'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserStats {
  totalAnswers: number
  correctAnswers: number
  incorrectAnswers: number
  successRate: number
  questionnairesCompleted: number
  forumThreads: number
  forumPosts: number
}

interface User {
  id: string
  email: string
  role: string
  active: boolean
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  stats: UserStats
}

interface UserHistory {
  answers: Array<{
    id: string
    question: string
    answer: string
    correctAnswer: string
    isCorrect: boolean
    questionnaire: string
    questionnaireType: string
    createdAt: Date
  }>
  questionnaires: Array<{
    questionnaireId: string
    title: string
    type: string
    totalAnswers: number
    correctAnswers: number
    lastAttempt: Date
  }>
  forumThreads: Array<{
    id: string
    title: string
    createdAt: Date
    _count: { posts: number }
  }>
  forumPosts: Array<{
    id: string
    content: string
    createdAt: Date
    thread: { title: string }
  }>
}

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userHistory, setUserHistory] = useState<UserHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      console.log('[Users Management] Cargando usuarios...')
      const res = await fetch('/api/admin/users')
      console.log('[Users Management] Respuesta:', res.status, res.ok)
      if (res.ok) {
        const data = await res.json()
        console.log('[Users Management] Usuarios recibidos:', data.length, data)
        setUsers(data)
      } else {
        console.error('[Users Management] Error en respuesta:', res.status)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserHistory = async (userId: string) => {
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUserHistory(data.history)
      }
    } catch (error) {
      console.error('Error loading user history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    loadUserHistory(user.id)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`¿Cambiar rol a ${newRole}?`)) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (res.ok) {
        await loadUsers()
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, role: newRole })
        }
      }
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleToggleActive = async (userId: string, active: boolean) => {
    const action = active ? 'activar' : 'desactivar'
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      })

      if (res.ok) {
        await loadUsers()
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, active })
        }
      }
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleExportHistory = async (userId: string, email: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/export`)
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `historial_${email.replace('@', '_')}_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Error al exportar historial')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Error al exportar historial')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadUsers()
        if (selectedUser?.id === userId) {
          setSelectedUser(null)
          setUserHistory(null)
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando usuarios...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-2 inline-block">
                ← Volver al Panel de Administrador
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">👥 Gestión de Usuarios</h1>
              <p className="text-gray-600 mt-1">Administra usuarios y visualiza su historial de actividad</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{users.length}</div>
              <div className="text-sm text-gray-600">Total usuarios</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Buscar por email..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => setFilter('admin')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'admin'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admins ({users.filter(u => u.role === 'admin').length})
              </button>
              <button
                onClick={() => setFilter('user')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'user'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Usuarios ({users.filter(u => u.role === 'user').length})
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de usuarios */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Usuarios ({filteredUsers.length})
              </h2>
              
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedUser?.id === user.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 break-all">{user.email}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {user.role === 'admin' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                              👑 Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              👤 Usuario
                            </span>
                          )}
                          {user.emailVerified && (
                            <span className="text-blue-600 text-xs">✓ Verificado</span>
                          )}
                          {!user.active && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                              🚫 Desactivado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1 mt-2">
                      <div>📝 {user.stats.totalAnswers} respuestas</div>
                      <div>✅ {user.stats.successRate.toFixed(1)}% aciertos</div>
                      <div>📚 {user.stats.questionnairesCompleted} cuestionarios</div>
                      <div className="text-gray-500 mt-2">
                        Registro: {new Date(user.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No hay usuarios que coincidan</p>
                )}
              </div>
            </div>
          </div>

          {/* Detalle del usuario */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="bg-white rounded-xl shadow-lg p-6">
                {/* Header del usuario */}
                <div className="mb-6 pb-4 border-b">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedUser.email}</h2>
                        {!selectedUser.active && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                            🚫 Cuenta Desactivada
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">
                        Miembro desde {new Date(selectedUser.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <select
                        value={selectedUser.role}
                        onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                        className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        disabled={!selectedUser.active}
                      >
                        <option value="user">👤 Usuario</option>
                        <option value="admin">👑 Admin</option>
                      </select>
                      
                      {selectedUser.active ? (
                        <button
                          onClick={() => handleToggleActive(selectedUser.id, false)}
                          className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition"
                          title="Desactivar usuario temporalmente"
                        >
                          🚫 Desactivar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(selectedUser.id, true)}
                          className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                          title="Reactivar usuario"
                        >
                          ✓ Activar
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleExportHistory(selectedUser.id, selectedUser.email)}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                        title="Exportar historial completo"
                      >
                        📥 Exportar
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                        title="Eliminar usuario permanentemente"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Estadísticas resumidas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">{selectedUser.stats.totalAnswers}</div>
                      <div className="text-sm text-gray-600">Respuestas totales</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{selectedUser.stats.successRate.toFixed(1)}%</div>
                      <div className="text-sm text-gray-600">Tasa de acierto</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-purple-600">{selectedUser.stats.questionnairesCompleted}</div>
                      <div className="text-sm text-gray-600">Cuestionarios</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-orange-600">{selectedUser.stats.forumPosts}</div>
                      <div className="text-sm text-gray-600">Posts en foro</div>
                    </div>
                  </div>
                </div>

                {/* Historial */}
                {loadingHistory ? (
                  <div className="text-center py-12">
                    <div className="animate-pulse text-gray-500">Cargando historial...</div>
                  </div>
                ) : userHistory ? (
                  <div className="space-y-6">
                    {/* Cuestionarios completados */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">📚 Cuestionarios Realizados</h3>
                      <div className="space-y-3">
                        {userHistory.questionnaires.map((q, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800">{q.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {q.type === 'theory' ? '📘 Teoría' : '📗 Práctico'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">
                                  {q.totalAnswers > 0 ? ((q.correctAnswers / q.totalAnswers) * 100).toFixed(0) : 0}%
                                </div>
                                <div className="text-xs text-gray-600">
                                  {q.correctAnswers}/{q.totalAnswers} correctas
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              Último intento: {new Date(q.lastAttempt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        ))}
                        {userHistory.questionnaires.length === 0 && (
                          <p className="text-gray-500 text-center py-4">No ha completado cuestionarios</p>
                        )}
                      </div>
                    </div>

                    {/* Últimas respuestas */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3">📝 Últimas Respuestas ({userHistory.answers.length})</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {userHistory.answers.slice(0, 20).map((answer) => (
                          <div
                            key={answer.id}
                            className={`p-3 rounded-lg border ${
                              answer.isCorrect
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">
                                  {answer.question.substring(0, 100)}...
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {answer.questionnaire} · {new Date(answer.createdAt).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                              <div className="ml-3">
                                {answer.isCorrect ? (
                                  <span className="text-green-600 font-bold">✓</span>
                                ) : (
                                  <span className="text-red-600 font-bold">✗</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actividad en el foro */}
                    {(userHistory.forumThreads.length > 0 || userHistory.forumPosts.length > 0) && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-3">💬 Actividad en Foro</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Hilos creados ({userHistory.forumThreads.length})</h4>
                            <div className="space-y-2">
                              {userHistory.forumThreads.slice(0, 5).map((thread) => (
                                <div key={thread.id} className="bg-gray-50 rounded p-2 text-sm">
                                  <p className="font-medium text-gray-800">{thread.title}</p>
                                  <p className="text-xs text-gray-600">
                                    {thread._count.posts} respuestas · {new Date(thread.createdAt).toLocaleDateString('es-ES')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Últimos posts ({userHistory.forumPosts.length})</h4>
                            <div className="space-y-2">
                              {userHistory.forumPosts.slice(0, 5).map((post) => (
                                <div key={post.id} className="bg-gray-50 rounded p-2 text-sm">
                                  <p className="text-gray-700">{post.content.substring(0, 80)}...</p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {new Date(post.createdAt).toLocaleDateString('es-ES')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Selecciona un usuario
                </h3>
                <p className="text-gray-600">
                  Elige un usuario de la lista para ver su historial completo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
