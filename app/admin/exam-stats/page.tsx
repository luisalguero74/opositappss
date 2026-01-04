'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminExamStats() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [simulations, setSimulations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadStats()
  }, [session])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/exam-stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setSimulations(data.simulations)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Cargando estadísticas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/admin"
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            ← Volver al Panel de Admin
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-8 mb-8 text-white">
          <h1 className="text-4xl font-bold mb-2">📊 Estadísticas de Simulacros de Examen</h1>
          <p className="opacity-90">Vista completa del rendimiento de los usuarios</p>
        </div>

        {/* Tarjetas de estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Simulacros</span>
              <span className="text-3xl">📝</span>
            </div>
            <div className="text-4xl font-bold text-purple-600">{stats?.total || 0}</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Nota Media</span>
              <span className="text-3xl">⭐</span>
            </div>
            <div className="text-4xl font-bold text-blue-600">{stats?.avgScore || 0}/85</div>
            <div className="text-sm text-gray-500 mt-1">
              {stats?.avgScore ? ((parseFloat(stats.avgScore) / 85) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Tasa de Aprobados</span>
              <span className="text-3xl">✅</span>
            </div>
            <div className="text-4xl font-bold text-green-600">{stats?.passRate || 0}%</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Media Teoría</span>
              <span className="text-3xl">📚</span>
            </div>
            <div className="text-4xl font-bold text-indigo-600">{stats?.avgTheoryScore || 0}/70</div>
            <div className="text-sm text-gray-500 mt-1">
              {stats?.avgTheoryScore ? ((parseFloat(stats.avgTheoryScore) / 70) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Media Práctico</span>
              <span className="text-3xl">💼</span>
            </div>
            <div className="text-4xl font-bold text-orange-600">{stats?.avgPracticalScore || 0}/15</div>
            <div className="text-sm text-gray-500 mt-1">
              {stats?.avgPracticalScore ? ((parseFloat(stats.avgPracticalScore) / 15) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Tiempo Medio</span>
              <span className="text-3xl">⏱️</span>
            </div>
            <div className="text-4xl font-bold text-pink-600">{stats?.avgTimeSpent || 0}</div>
            <div className="text-sm text-gray-500 mt-1">minutos (de 120)</div>
          </div>
        </div>

        {/* Tabla de simulacros */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500">
            <h2 className="text-2xl font-bold text-white">Todos los Simulacros Completados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Práctico</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {simulations.map((sim) => {
                  const percentage = ((sim.score / 85) * 100).toFixed(1)
                  const isPassed = parseFloat(percentage) >= 50
                  
                  return (
                    <tr key={sim.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{sim.user.name || sim.user.email}</div>
                        <div className="text-xs text-gray-500">{sim.user.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(sim.completedAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-lg font-bold ${
                          isPassed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {sim.score}/85
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sim.theoryScore}/70</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sim.practicalScore}/15</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{sim.timeSpent} min</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                          parseFloat(percentage) >= 70 ? 'bg-green-100 text-green-800' :
                          parseFloat(percentage) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {simulations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No hay simulacros completados aún
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
