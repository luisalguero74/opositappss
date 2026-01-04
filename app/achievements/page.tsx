'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  unlockedAt?: string
}

export default function AchievementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [unlocked, setUnlocked] = useState<Achievement[]>([])
  const [locked, setLocked] = useState<Achievement[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchAchievements()
    }
  }, [status, router])

  const fetchAchievements = async () => {
    try {
      const res = await fetch('/api/user/achievements')
      if (res.ok) {
        const data = await res.json()
        setUnlocked(data.unlocked || [])
        setLocked(data.locked || [])
        setTotalPoints(data.totalPoints || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600"></div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard" className="text-yellow-600 hover:text-yellow-700 font-semibold mb-4 inline-block">
          ← Volver
        </Link>
        
        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-2xl p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🏆 Logros</h1>
              <p className="text-yellow-100">{unlocked.length} desbloqueados · {totalPoints} puntos</p>
            </div>
            <div className="text-6xl">🎯</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ✅ Desbloqueados ({unlocked.length})
            </h2>
            <div className="space-y-4">
              {unlocked.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aún no has desbloqueado ningún logro. ¡Sigue estudiando!
                </p>
              ) : (
                unlocked.map(a => (
                  <div key={a.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
                      {a.points} pts
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="text-5xl">{a.icon}</div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{a.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{a.description}</p>
                        {a.unlockedAt && (
                          <p className="text-xs text-green-600">
                            Desbloqueado: {new Date(a.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🔒 Bloqueados ({locked.length})
            </h2>
            <div className="space-y-4">
              {locked.map(a => (
                <div key={a.id} className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 relative overflow-hidden opacity-60">
                  <div className="absolute top-0 right-0 bg-gray-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold">
                    {a.points} pts
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-5xl grayscale">{a.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-700 mb-1">{a.name}</h3>
                      <p className="text-sm text-gray-600">{a.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sigue estudiando</h2>
          <p className="text-gray-600 mb-6">
            Completa cuestionarios, mantén rachas y mejora tu precisión para desbloquear más logros
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/quiz" 
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Iniciar Cuestionario
            </Link>
            <Link 
              href="/analytics-dashboard" 
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Ver Estadísticas
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
