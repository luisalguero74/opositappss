'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopicDifficultySelector from '@/components/TopicDifficultySelector'

interface TheoryQuestion {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  questionnaireName: string
}

interface PracticalQuestion {
  text: string
  options: string[]
  correctAnswer: string
}

interface PracticalCase {
  enunciado: string
  questions: PracticalQuestion[]
}

export default function ExamSimulationPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [simulations, setSimulations] = useState<any[]>([])
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState({
    generalTopics: [] as string[],
    specificTopics: [] as string[],
    difficulty: 'todas' as 'todas' | 'facil' | 'media' | 'dificil'
  })

  useEffect(() => {
    loadSimulations()
  }, [])

  const loadSimulations = async () => {
    try {
      const res = await fetch('/api/exam-simulation')
      if (res.ok) {
        const data = await res.json()
        setSimulations(data)
      }
    } catch (error) {
      console.error('Error loading simulations:', error)
    }
  }

  const startNewSimulation = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/exam-simulation', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generalTopics: selectedTopics.generalTopics,
          specificTopics: selectedTopics.specificTopics,
          difficulty: selectedTopics.difficulty
        })
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/dashboard/exam-simulation/${data.id}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al crear simulacro')
      }
    } catch (error) {
      console.error('Error starting simulation:', error)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const completedSimulations = simulations.filter(s => s.completed)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link href="/dashboard" className="text-purple-600 hover:text-purple-700 font-semibold mb-2 inline-block">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">📝 Simulacro de Examen</h1>
          <p className="text-gray-600 mt-1">Practica como en el examen real de oposiciones</p>
        </div>

        {/* Info */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold mb-4">🎯 Formato del Examen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Parte 1: Test de Temario</h3>
              <ul className="space-y-1 text-purple-100">
                <li>✓ 70 preguntas aleatorias</li>
                <li>✓ 4 opciones de respuesta</li>
                <li>✓ Solo una correcta</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Parte 2: Supuesto Práctico</h3>
              <ul className="space-y-1 text-purple-100">
                <li>✓ 1 caso práctico completo</li>
                <li>✓ 15 preguntas sobre el caso</li>
                <li>✓ 4 opciones de respuesta</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t-2 border-purple-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">⏱️ 120 minutos</p>
                <p className="text-sm text-purple-100">Tiempo total del examen</p>
              </div>
              <div>
                <p className="text-2xl font-bold">🔴 Alarma a los 90 min</p>
                <p className="text-sm text-purple-100">Quedan 30 minutos - contador en rojo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="text-center mb-8">
          <button
            onClick={() => setShowTopicSelector(!showTopicSelector)}
            className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition shadow-lg mb-4"
          >
            {showTopicSelector ? '📋 Ocultar Opciones' : '⚙️ Personalizar Examen'}
          </button>
        </div>

        {/* Topic Selector */}
        {showTopicSelector && (
          <div className="mb-8">
            <TopicDifficultySelector 
              onSelectionChange={setSelectedTopics}
              showDifficulty={true}
            />
          </div>
        )}

        {/* Start Exam Button */}
        <div className="text-center mb-8">
          <button
            onClick={startNewSimulation}
            disabled={loading}
            className="px-12 py-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-xl rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Preparando examen...' : '🚀 Iniciar Nuevo Simulacro'}
          </button>
          <p className="text-gray-600 mt-3">
            {selectedTopics.generalTopics.length > 0 || selectedTopics.specificTopics.length > 0
              ? `Examen personalizado: ${selectedTopics.generalTopics.length + selectedTopics.specificTopics.length} temas, dificultad ${selectedTopics.difficulty}`
              : 'Se generará un examen con preguntas aleatorias de todos los temas'}
          </p>
        </div>

        {/* History */}
        {completedSimulations.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📊 Historial de Simulacros</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Puntuación</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Teoría</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Práctico</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tiempo</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">%</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSimulations.map(sim => (
                    <tr key={sim.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(sim.completedAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-lg">{sim.score}/85</span>
                      </td>
                      <td className="py-3 px-4">{sim.theoryScore}/70</td>
                      <td className="py-3 px-4">{sim.practicalScore}/15</td>
                      <td className="py-3 px-4">{sim.timeSpent} min</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full font-semibold ${
                          (sim.score / 85) >= 0.7 
                            ? 'bg-green-100 text-green-700' 
                            : (sim.score / 85) >= 0.5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {((sim.score / 85) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
