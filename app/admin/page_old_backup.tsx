'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Admin() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('theory')
  const [questionsJson, setQuestionsJson] = useState('')
  const [solution, setSolution] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const questions = JSON.parse(questionsJson)
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, questions, solution })
      })
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cuestionario subido exitosamente' })
        setTitle('')
        setQuestionsJson('')
        setSolution('')
      } else {
        setMessage({ type: 'error', text: 'Error al subir el cuestionario' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: JSON inválido o problema de conexión' })
    } finally {
      setLoading(false)
    }
  }

  if (!session || !session.user || session.user.role !== 'ADMIN') {
    router.push('/dashboard')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">No autorizado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard" className="text-orange-600 hover:text-orange-700 font-semibold">← Volver al Dashboard</Link>
          </div>
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h1 className="text-4xl font-bold text-white">Panel de Administrador</h1>
              <p className="text-red-100 mt-2">Gestiona los cuestionarios de la plataforma</p>

                    {/* Tarjetas de acceso rápido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 flex items-center justify-center">
                          <div className="text-white text-5xl">📊</div>
                        </div>
                        <div className="p-6">
                          <h2 className="text-xl font-bold text-gray-800 mb-3">Estadísticas del Sistema</h2>
                          <p className="text-gray-600 mb-4 text-sm">Analiza el rendimiento global y por usuario. Identifica errores repetidos y patrones de aprendizaje.</p>
                          <Link href="/admin/statistics" className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition text-sm">
                            Ver Estadísticas →
                          </Link>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition transform hover:scale-105">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-32 flex items-center justify-center">
                          <div className="text-white text-5xl">🎥</div>
                        </div>
                        <div className="p-6">
                          <h2 className="text-xl font-bold text-gray-800 mb-3">Panel de Moderación</h2>
                          <p className="text-gray-600 mb-4 text-sm">Controla salas de videollamada activas. Silencia, expulsa participantes y modera el foro.</p>
                          <Link href="/admin/rooms" className="inline-block bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold px-5 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition text-sm">
                            Ir a Moderación →
                          </Link>
                        </div>
                      </div>
                    </div>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 px-6 py-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Crear Nuevo Cuestionario</h2>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Título del Cuestionario</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition"
              placeholder="Ej: Cuestionario Tema 1 - Introducción"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Tipo de Cuestionario</label>
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition"
            >
              <option value="theory">📚 Temario</option>
              <option value="practical">💼 Supuesto Práctico</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Preguntas (Formato JSON)</label>
            <textarea
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition font-mono text-sm h-64"
              placeholder='[{"text": "¿Pregunta?", "options": ["Opción A", "Opción B", "Opción C"], "correctAnswer": "Opción A", "explanation": "Explicación detallada"}]'
              required
            />
            <p className="text-xs text-gray-500 mt-2">Formato JSON con array de objetos. Cada pregunta debe tener: text, options, correctAnswer y explanation</p>
          </div>

          <div className="mb-8">
            <label className="block text-gray-700 font-semibold mb-2">Solución (Opcional)</label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 transition h-32"
              placeholder="Texto con la solución completa del supuesto práctico (opcional)"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-4 rounded-lg hover:from-red-700 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Subiendo...' : '📤 Subir Cuestionario'}
          </button>
        </form>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-800 mb-2">💡 Consejos:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Asegúrate de que el JSON esté bien formateado antes de enviar</li>
            <li>• Las opciones deben ser un array de strings</li>
            <li>• La respuesta correcta debe coincidir exactamente con una de las opciones</li>
            <li>• Incluye explicaciones claras para ayudar al aprendizaje</li>
          </ul>
        </div>
      </div>
    </div>
  )
}