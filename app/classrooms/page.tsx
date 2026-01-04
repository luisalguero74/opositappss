'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Classroom {
  id: string
  name: string
  description: string | null
  roomId: string
  active: boolean
  participant: {
    role: string
    joinedAt: string
  }
  sessions: {
    id: string
    title: string
    scheduledAt: string
    status: string
  }[]
  _count: {
    participants: number
  }
}

export default function MisAulasVirtuales() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      loadClassrooms()
    }
  }, [status, router])

  const loadClassrooms = async () => {
    try {
      const res = await fetch('/api/classrooms')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Cargando tus aulas...</p>
        </div>
      </div>
    )
  }

  // Filtrar aulas
  const filteredClassrooms = classrooms.filter(classroom => {
    if (filter === 'active') return classroom.active
    if (filter === 'upcoming') {
      return classroom.sessions.some(session => 
        session.status === 'scheduled' && new Date(session.scheduledAt) > new Date()
      )
    }
    return true
  })

  // Próxima sesión
  const getNextSession = (classroom: Classroom) => {
    const upcomingSessions = classroom.sessions
      .filter(s => s.status === 'scheduled' && new Date(s.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    
    return upcomingSessions[0] || null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Mis Aulas Virtuales
          </h1>
          <p className="text-xl text-gray-600">
            Accede a tus clases y sesiones programadas
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todas ({classrooms.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'active'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Activas ({classrooms.filter(c => c.active).length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'upcoming'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Con sesiones próximas
            </button>
          </div>
        </div>

        {/* Lista de aulas */}
        {filteredClassrooms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-6">📚</div>
            {filter === 'all' ? (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  No estás inscrito en ningún aula aún
                </h2>
                <p className="text-gray-600 mb-8">
                  Contacta con tu instructor para que te añada a un aula virtual
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  No hay aulas con este filtro
                </h2>
                <p className="text-gray-600 mb-8">
                  Prueba con otro filtro para ver más aulas
                </p>
              </>
            )}
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
            >
              Volver al Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassrooms.map(classroom => {
              const nextSession = getNextSession(classroom)
              
              return (
                <div key={classroom.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition">
                  {/* Header del aula */}
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">🎓</div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        classroom.active ? 'bg-green-500' : 'bg-gray-500'
                      }`}>
                        {classroom.active ? '✓ Activa' : '○ Inactiva'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{classroom.name}</h3>
                    {classroom.description && (
                      <p className="text-purple-100 text-sm line-clamp-2">{classroom.description}</p>
                    )}
                  </div>

                  {/* Info del aula */}
                  <div className="p-6">
                    {/* Rol */}
                    <div className="mb-4">
                      <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold ${
                        classroom.participant.role === 'moderator'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {classroom.participant.role === 'moderator' ? '👑 Moderador' : '👤 Estudiante'}
                      </span>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {classroom._count.participants}
                        </div>
                        <p className="text-xs text-gray-600">Participantes</p>
                      </div>
                      <div className="bg-pink-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-pink-600">
                          {classroom.sessions.length}
                        </div>
                        <p className="text-xs text-gray-600">Sesiones</p>
                      </div>
                    </div>

                    {/* Próxima sesión */}
                    {nextSession && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          📅 Próxima sesión
                        </p>
                        <p className="text-sm font-bold text-blue-700">
                          {nextSession.title}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {new Date(nextSession.scheduledAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Fecha de inscripción */}
                    <p className="text-xs text-gray-500 mb-4">
                      Inscrito el {new Date(classroom.participant.joinedAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>

                    {/* Botón entrar */}
                    <Link
                      href={`/classroom/${classroom.id}`}
                      className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-center"
                    >
                      Entrar al Aula
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Botón volver */}
        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="inline-block px-8 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
