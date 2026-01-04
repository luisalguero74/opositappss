'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import HelpButton from '@/components/HelpButton'

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
  sessions?: Array<{
    id: string
    title: string
    scheduledAt: string
    duration?: number
    status: string
  }>
  _count: {
    participants: number
  }
}

export default function UserClassrooms() {
  const { data: session } = useSession()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      loadClassrooms()
    }
  }, [session])

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando aulas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-12 px-4">
      <HelpButton />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 font-semibold mb-4 inline-block">
            ← Volver al Dashboard
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">🎓 Mis Aulas Virtuales</h1>
            <p className="opacity-90">Accede a tus clases en línea</p>
          </div>
        </div>

        {/* Aulas */}
        {classrooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No estás inscrito en ninguna aula</h3>
            <p className="text-gray-600">Contacta con tu administrador para que te añada a un aula virtual</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(classroom => {
              const upcomingSessions = classroom.sessions?.filter(s => 
                s.status === 'scheduled' && new Date(s.scheduledAt) > new Date()
              ) || []
              
              return (
              <div key={classroom.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{classroom.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    classroom.participant.role === 'moderator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {classroom.participant.role === 'moderator' ? '👑 Moderador' : '👤 Estudiante'}
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
                  {classroom.active ? (
                    <div className="flex items-center gap-2">
                      <span>✓</span>
                      <span className="text-green-600 font-semibold">Aula activa</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>○</span>
                      <span className="text-gray-500">Aula inactiva</span>
                    </div>
                  )}
                </div>

                {/* Próximas sesiones */}
                {upcomingSessions.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-2">📅 Próximas sesiones:</p>
                    <div className="space-y-1">
                      {upcomingSessions.map(session => (
                        <div key={session.id} className="text-xs text-blue-700">
                          <span className="font-semibold">{session.title}</span>
                          <br />
                          <span className="text-blue-600">
                            {new Date(session.scheduledAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/classroom/${classroom.id}`}
                  className="block w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
                >
                  Entrar al Aula
                </Link>
              </div>
            )})
            }
          </div>
        )}
      </div>
    </div>
  )
}
