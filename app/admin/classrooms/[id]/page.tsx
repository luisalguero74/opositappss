'use client'

import { use, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Participant {
  id: string
  role: string
  canSpeak: boolean
  canShareScreen: boolean
  isBanned: boolean
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
  }
}

interface Session {
  id: string
  title: string
  description: string
  scheduledAt: string
  duration: number
  status: string
}

interface Classroom {
  id: string
  name: string
  description: string
  roomId: string
  password: string
  maxParticipants: number
  active: boolean
  createdAt: string
  participants: Participant[]
  sessions: Session[]
  createdBy: {
    name: string
    email: string
  }
}

interface User {
  id: string
  name: string
  email: string
}

export default function ManageClassroom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('participants')
  
  // Estados para participantes
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'moderator' | 'student'>('student')
  const [addingParticipant, setAddingParticipant] = useState(false)

  // Estados para sesiones
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    sendInvitations: true
  })
  const [creatingSession, setCreatingSession] = useState(false)

  // Estado para configuración
  const [editMode, setEditMode] = useState(false)
  const [editedClassroom, setEditedClassroom] = useState({
    name: '',
    description: '',
    password: '',
    maxParticipants: 50,
    active: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (String(session?.user?.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadClassroom()
    loadUsers()
  }, [session, router, id])

  const loadClassroom = async () => {
    try {
      const res = await fetch(`/api/admin/classrooms/${id}`)
      if (res.ok) {
        const data = await res.json()
        setClassroom(data)
        setEditedClassroom({
          name: data.name,
          description: data.description || '',
          password: data.password || '',
          maxParticipants: data.maxParticipants,
          active: data.active
        })
      }
    } catch (error) {
      console.error('Error loading classroom:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleAddParticipant = async () => {
    if (!selectedUserId) return

    setAddingParticipant(true)
    try {
      const res = await fetch(`/api/admin/classrooms/${id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [selectedUserId],
          role: selectedRole
        })
      })

      if (res.ok) {
        await loadClassroom()
        setSelectedUserId('')
      } else {
        alert('Error al añadir participante')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setAddingParticipant(false)
    }
  }

  const handleRemoveParticipant = async (userId: string) => {
    if (!confirm('¿Eliminar este participante?')) return

    try {
      const res = await fetch(`/api/admin/classrooms/${id}/participants?userId=${userId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadClassroom()
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingSession(true)

    try {
      const res = await fetch(`/api/admin/classrooms/${id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      })

      if (res.ok) {
        await loadClassroom()
        setShowSessionModal(false)
        setNewSession({
          title: '',
          description: '',
          scheduledAt: '',
          duration: 60,
          sendInvitations: true
        })
        alert('Sesión creada y invitaciones enviadas')
      } else {
        alert('Error al crear sesión')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setCreatingSession(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/classrooms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedClassroom)
      })

      if (res.ok) {
        await loadClassroom()
        setEditMode(false)
        alert('Configuración actualizada')
      } else {
        alert('Error al guardar')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClassroom = async () => {
    if (!confirm('¿Eliminar esta aula permanentemente? Esta acción no se puede deshacer.')) return

    try {
      const res = await fetch(`/api/admin/classrooms/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        router.push('/admin/classrooms')
      } else {
        alert('Error al eliminar aula')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando aula...</p>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-600">Aula no encontrada</p>
      </div>
    )
  }

  const availableUsers = allUsers.filter(
    user => !classroom.participants.some(p => p.user.id === user.id)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/classrooms" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
            ← Volver a Aulas
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">{classroom.name}</h1>
                <p className="opacity-90">{classroom.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span>🔑 Room ID: {classroom.roomId}</span>
                  {classroom.password && <span>🔒 Con contraseña</span>}
                  <span className={`px-3 py-1 rounded-full ${classroom.active ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {classroom.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <Link
                href={`/classroom/${classroom.id}`}
                className="px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                Entrar al Aula
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'participants'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              👥 Participantes ({classroom.participants.length})
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'sessions'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📅 Sesiones ({classroom.sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 font-semibold transition ${
                activeTab === 'settings'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ⚙️ Configuración
            </button>
          </div>

          <div className="p-6">
            {/* Tab: Participantes */}
            {activeTab === 'participants' && (
              <div className="space-y-6">
                {/* Añadir participante */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Añadir Participante</h3>
                  <div className="flex gap-3">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as 'moderator' | 'student')}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="student">Estudiante</option>
                      <option value="moderator">Moderador</option>
                    </select>
                    <button
                      onClick={handleAddParticipant}
                      disabled={!selectedUserId || addingParticipant}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {addingParticipant ? 'Añadiendo...' : 'Añadir'}
                    </button>
                  </div>
                </div>

                {/* Lista de participantes */}
                <div className="space-y-3">
                  {classroom.participants.map(participant => (
                    <div key={participant.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{participant.user.name}</p>
                        <p className="text-sm text-gray-600">{participant.user.email}</p>
                        <div className="flex gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            participant.role === 'moderator' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {participant.role === 'moderator' ? '👑 Moderador' : '👤 Estudiante'}
                          </span>
                          {participant.canShareScreen && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              🖥️ Puede compartir
                            </span>
                          )}
                          {participant.isBanned && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                              🚫 Bloqueado
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveParticipant(participant.user.id)}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}

                  {classroom.participants.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay participantes aún</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Sesiones */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <button
                  onClick={() => setShowSessionModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                >
                  ➕ Programar Nueva Sesión
                </button>

                <div className="space-y-3">
                  {classroom.sessions.map(session => (
                    <div key={session.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{session.title}</h4>
                          {session.description && (
                            <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-gray-600">
                            <span>📅 {new Date(session.scheduledAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                            <span>⏱️ {session.duration} min</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          session.status === 'live' ? 'bg-green-100 text-green-700' :
                          session.status === 'ended' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {session.status === 'scheduled' ? '📋 Programada' :
                           session.status === 'live' ? '🔴 En vivo' :
                           session.status === 'ended' ? '✓ Finalizada' : '✗ Cancelada'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {classroom.sessions.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay sesiones programadas</p>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Configuración */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {!editMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                        <p className="text-gray-900">{classroom.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                        <p className="text-gray-900">{classroom.active ? 'Activa' : 'Inactiva'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Máx. Participantes</label>
                        <p className="text-gray-900">{classroom.maxParticipants}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
                        <p className="text-gray-900">{classroom.password || 'Sin contraseña'}</p>
                      </div>
                    </div>
                    {classroom.description && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                        <p className="text-gray-900">{classroom.description}</p>
                      </div>
                    )}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setEditMode(true)}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                      >
                        Editar Configuración
                      </button>
                      <button
                        onClick={handleDeleteClassroom}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                      >
                        Eliminar Aula
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre</label>
                      <input
                        type="text"
                        value={editedClassroom.name}
                        onChange={(e) => setEditedClassroom({ ...editedClassroom, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={editedClassroom.description}
                        onChange={(e) => setEditedClassroom({ ...editedClassroom, description: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                      <input
                        type="text"
                        value={editedClassroom.password}
                        onChange={(e) => setEditedClassroom({ ...editedClassroom, password: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Máx. Participantes</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={editedClassroom.maxParticipants}
                        onChange={(e) => setEditedClassroom({ ...editedClassroom, maxParticipants: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="active"
                        checked={editedClassroom.active}
                        onChange={(e) => setEditedClassroom({ ...editedClassroom, active: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <label htmlFor="active" className="font-semibold text-gray-700">Aula activa</label>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false)
                          setEditedClassroom({
                            name: classroom.name,
                            description: classroom.description || '',
                            password: classroom.password || '',
                            maxParticipants: classroom.maxParticipants,
                            active: classroom.active
                          })
                        }}
                        disabled={saving}
                        className="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal crear sesión */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900">Programar Sesión</h3>
            </div>

            <form onSubmit={handleCreateSession} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                <input
                  type="text"
                  required
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Ej: Clase sobre Tema 1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Descripción de la sesión..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  required
                  value={newSession.scheduledAt}
                  onChange={(e) => setNewSession({ ...newSession, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duración (minutos)</label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={newSession.duration}
                  onChange={(e) => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="sendInvitations"
                  checked={newSession.sendInvitations}
                  onChange={(e) => setNewSession({ ...newSession, sendInvitations: e.target.checked })}
                  className="w-5 h-5"
                />
                <label htmlFor="sendInvitations" className="font-semibold text-gray-700">
                  Enviar invitaciones por email
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  disabled={creatingSession}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
                >
                  {creatingSession ? 'Creando...' : 'Crear Sesión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
