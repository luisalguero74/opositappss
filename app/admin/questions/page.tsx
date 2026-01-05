'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  questionnaireName: string
}

export default function QuestionsDatabase() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'theory' | 'practical'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const res = await fetch('/api/admin/questions')
      if (res.ok) {
        const data = await res.json()
        setQuestions(data)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(filter.toLowerCase()) ||
                         q.questionnaireName.toLowerCase().includes(filter.toLowerCase())
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'theory' && q.questionnaireName.toLowerCase().includes('tema')) ||
                       (typeFilter === 'practical' && q.questionnaireName.toLowerCase().includes('práctico'))
    return matchesSearch && matchesType
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando base de datos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-2 inline-block">
            ← Volver al Panel de Administrador
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">📚 Base de Datos de Preguntas</h1>
          <p className="text-gray-600 mt-1">Todas las preguntas de test de temario y supuestos prácticos</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
            <div className="text-sm text-gray-600">Total Preguntas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-green-600">
              {questions.filter(q => q.questionnaireName.toLowerCase().includes('tema')).length}
            </div>
            <div className="text-sm text-gray-600">Test de Temario</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-3xl font-bold text-purple-600">
              {questions.filter(q => q.questionnaireName.toLowerCase().includes('práctico')).length}
            </div>
            <div className="text-sm text-gray-600">Supuestos Prácticos</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Buscar</label>
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Buscar por pregunta o cuestionario..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
              >
                <option value="all">Todos</option>
                <option value="theory">Test de Temario</option>
                <option value="practical">Supuestos Prácticos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Cuestionario</th>
                  <th className="text-left py-4 px-6 font-semibold">Pregunta</th>
                  <th className="text-left py-4 px-6 font-semibold">Opciones</th>
                  <th className="text-left py-4 px-6 font-semibold">Respuesta Correcta</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q, idx) => (
                  <tr key={q.id} className={`border-b ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-purple-600">{q.questionnaireName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-gray-800">{q.text}</p>
                    </td>
                    <td className="py-4 px-6">
                      <ul className="text-sm text-gray-600 space-y-1">
                        {q.options.map((opt, i) => (
                          <li key={i} className={opt === q.correctAnswer ? 'text-green-600 font-semibold' : ''}>
                            {String.fromCharCode(65 + i)}) {opt}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {q.correctAnswer}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredQuestions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      No se encontraron preguntas con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-600">
          Mostrando {filteredQuestions.length} de {questions.length} preguntas
        </div>
      </div>
    </div>
  )
}
