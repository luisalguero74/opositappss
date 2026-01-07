'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Classroom {
  id: string
  name: string
  description: string
  roomId: string
  password: string
  maxParticipants: number
  active: boolean
  createdAt: string
  _count: {
    participants: number
    sessions: number
  }
}

export default function AdminClassrooms() {
  const { data: session } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    description: '',
    password: '',
    maxParticipants: 50
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (String(session?.user?.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadClassrooms()
  }, [session, router])

  const loadClassrooms = async () => {
    try {
      const res = await fetch('/api/admin/classrooms')
      if (res.ok) {
        const data = await res.json()
        setClassrooms(data)
      }
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/admin/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassroom)
      })

      if (res.ok) {
        await loadClassrooms()
        setShowCreateModal(false)
        setNewClassroom({ name: '', description: '', password: '', maxParticipants: 50 })
      } else {
        let message = 'Error al crear aula'
        try {
          const data = await res.json()
          if (data?.error) message = data.error
          if (data?.code) message = `${message} (código: ${data.code})`
          if (data?.details) message = `${message}: ${data.details}`
        } catch {
          // ignore
        }
        alert(message)
      }
    } catch (error) {
      console.error('Error creating classroom:', error)
      alert('Error de conexión')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteClassroom = async (classroomId: string, classroomName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el aula "${classroomName}"? Esta acción no se puede deshacer y se eliminarán todos los participantes y sesiones asociadas.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await loadClassrooms()
        alert('Aula eliminada correctamente')
      } else {
        alert('Error al eliminar el aula')
      }
    } catch (error) {
      console.error('Error deleting classroom:', error)
      alert('Error de conexión')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando aulas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
            ← Volver al Panel de Admin
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">🎓 Gestión de Aulas Virtuales</h1>
            <p className="opacity-90">Crea y administra aulas virtuales con Jitsi Meet</p>
          </div>
        </div>

        {/* Botón crear aula */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
          >
            ➕ Crear Nueva Aula
          </button>
        </div>

        {/* Lista de aulas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map(classroom => (
            <div key={classroom.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{classroom.name}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  classroom.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {classroom.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {classroom.description && (
                <p className="text-gray-600 text-sm mb-4">{classroom.description}</p>
              )}

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <span>👥</span>
                  <span>{classroom._count.participants} participantes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{classroom._count.sessions} sesiones programadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>Máx: {classroom.maxParticipants}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <Link
                  href={`/admin/classrooms/${classroom.id}`}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition text-center"
                >
                  Gestionar
                </Link>
                <Link
                  href={`/classroom/${classroom.id}`}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition text-center"
                >
                  Entrar
                </Link>
              </div>
              <button
                onClick={() => handleDeleteClassroom(classroom.id, classroom.name)}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition"
              >
                🗑️ Eliminar Aula
              </button>
            </div>
          ))}

          {classrooms.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay aulas creadas</h3>
              <p className="text-gray-600">Crea tu primera aula virtual para empezar</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear aula */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold text-gray-900">Crear Nueva Aula</h3>
            </div>

            <form onSubmit={handleCreateClassroom} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del Aula *
                </label>
                <input
                  type="text"
                  required
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: Tema 1 - Derecho Administrativo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Descripción del aula..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña (opcional)
                </label>
                <input
                  type="text"
                  value={newClassroom.password}
                  onChange={(e) => setNewClassroom({ ...newClassroom, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Contraseña de acceso"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Máximo de Participantes
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={newClassroom.maxParticipants}
                  onChange={(e) => setNewClassroom({ ...newClassroom, maxParticipants: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
                >
                  {creating ? 'Creando...' : 'Crear Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
