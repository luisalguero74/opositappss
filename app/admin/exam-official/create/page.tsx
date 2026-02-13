'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Question {
  text: string
  options: [string, string, string, string]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  explanation: string
}

export default function CreateExamOfficialPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  
  // Parte 1: 70 preguntas test
  const [testQuestions, setTestQuestions] = useState<Question[]>(
    Array(70).fill(null).map(() => ({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
      explanation: ''
    }))
  )

  // Parte 2: Supuesto práctico
  const [practicalStatement, setPracticalStatement] = useState('')
  const [practicalQuestions, setPracticalQuestions] = useState<Question[]>(
    Array(15).fill(null).map(() => ({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 'A' as 'A' | 'B' | 'C' | 'D',
      explanation: ''
    }))
  )

  const [currentPart, setCurrentPart] = useState<'test' | 'practical'>('test')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const currentQuestions = currentPart === 'test' ? testQuestions : practicalQuestions
  const setCurrentQuestions = currentPart === 'test' ? setTestQuestions : setPracticalQuestions
  const totalQuestions = currentPart === 'test' ? 70 : 15

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...currentQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setCurrentQuestions(updated)
  }

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...currentQuestions]
    const newOptions = [...updated[qIndex].options] as [string, string, string, string]
    newOptions[optIndex] = value
    updated[qIndex] = { ...updated[qIndex], options: newOptions }
    setCurrentQuestions(updated)
  }

  const validateForm = () => {
    if (!title.trim()) return 'El título es obligatorio'
    
    // Validar preguntas test
    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i]
      if (!q.text.trim()) return `Pregunta test ${i + 1}: falta el enunciado`
      if (q.options.some(opt => !opt.trim())) return `Pregunta test ${i + 1}: todas las opciones son obligatorias`
      if (!q.explanation.trim()) return `Pregunta test ${i + 1}: falta la explicación`
    }

    // Validar supuesto práctico
    if (!practicalStatement.trim()) return 'Falta el enunciado del supuesto práctico'

    for (let i = 0; i < practicalQuestions.length; i++) {
      const q = practicalQuestions[i]
      if (!q.text.trim()) return `Pregunta supuesto ${i + 1}: falta el enunciado`
      if (q.options.some(opt => !opt.trim())) return `Pregunta supuesto ${i + 1}: todas las opciones son obligatorias`
      if (!q.explanation.trim()) return `Pregunta supuesto ${i + 1}: falta la explicación`
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      alert(validationError)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/exam-official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          testQuestions: testQuestions.map(q => ({
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          })),
          practicalCase: {
            statement: practicalStatement,
            questions: practicalQuestions.map(q => ({
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }))
          },
          published: true
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear examen')
      }

      alert('✅ Examen oficial creado exitosamente')
      router.push('/admin/exam-official')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error al crear examen')
      alert('❌ ' + (err instanceof Error ? err.message : 'Error al crear examen'))
    } finally {
      setSubmitting(false)
    }
  }

  const currentQuestion = currentQuestions[currentIndex]
  const progress = ((currentIndex + 1) / totalQuestions) * 100
  const isComplete = currentQuestions.every(q => 
    q.text.trim() && q.options.every(opt => opt.trim()) && q.explanation.trim()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Crear Examen Oficial</h1>
            <Link
              href="/admin/exam-official"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
            >
              ← Volver
            </Link>
          </div>

          {/* Información general */}
          <div className="mb-6 pb-6 border-b">
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Título del Examen *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Examen Oficial AGE 2026"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del examen..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Selector de parte */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => { setCurrentPart('test'); setCurrentIndex(0) }}
              className={`flex-1 py-3 rounded-lg font-bold transition ${
                currentPart === 'test'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📝 Parte 1: Test (70 preguntas)
              {testQuestions.filter(q => q.text.trim()).length > 0 && (
                <span className="ml-2 text-sm">
                  ({testQuestions.filter(q => q.text.trim()).length}/70)
                </span>
              )}
            </button>
            <button
              onClick={() => { setCurrentPart('practical'); setCurrentIndex(0) }}
              className={`flex-1 py-3 rounded-lg font-bold transition ${
                currentPart === 'practical'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Parte 2: Supuesto Práctico (15 preguntas)
              {practicalQuestions.filter(q => q.text.trim()).length > 0 && (
                <span className="ml-2 text-sm">
                  ({practicalQuestions.filter(q => q.text.trim()).length}/15)
                </span>
              )}
            </button>
          </div>

          {/* Enunciado del supuesto práctico */}
          {currentPart === 'practical' && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <label className="block text-sm font-bold text-purple-900 mb-2">
                Enunciado del Supuesto Práctico *
              </label>
              <textarea
                value={practicalStatement}
                onChange={(e) => setPracticalStatement(e.target.value)}
                placeholder="Escribe aquí el enunciado del caso práctico que los usuarios leerán antes de responder las 15 preguntas..."
                rows={6}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          )}

          {/* Progreso */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                Pregunta {currentIndex + 1} de {totalQuestions}
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(progress)}% completado
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  currentPart === 'test' 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Formulario de pregunta */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Enunciado de la pregunta *
              </label>
              <textarea
                value={currentQuestion.text}
                onChange={(e) => updateQuestion(currentIndex, 'text', e.target.value)}
                placeholder="Escribe el enunciado de la pregunta..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4">
              {['A', 'B', 'C', 'D'].map((letter, i) => (
                <div key={letter}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Opción {letter} *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentQuestion.options[i]}
                      onChange={(e) => updateOption(currentIndex, i, e.target.value)}
                      placeholder={`Opción ${letter}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                    <button
                      onClick={() => updateQuestion(currentIndex, 'correctAnswer', letter)}
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        currentQuestion.correctAnswer === letter
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {currentQuestion.correctAnswer === letter ? '✓ Correcta' : 'Correcta?'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Explicación / Fundamento Legal *
              </label>
              <textarea
                value={currentQuestion.explanation}
                onChange={(e) => updateQuestion(currentIndex, 'explanation', e.target.value)}
                placeholder="Explica por qué la respuesta correcta es la correcta. Incluye referencias legales si aplica..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Navegación entre preguntas */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold disabled:opacity-50 hover:bg-gray-300 transition"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))}
              disabled={currentIndex === totalQuestions - 1}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold disabled:opacity-50 hover:shadow-lg transition"
            >
              Siguiente →
            </button>
          </div>

          {/* Mapa de preguntas */}
          <div className="mb-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Ir a pregunta:</h3>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: totalQuestions }, (_, i) => {
                const q = currentQuestions[i]
                const isComplete = q.text.trim() && q.options.every(opt => opt.trim()) && q.explanation.trim()
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-full aspect-square rounded-lg font-bold text-sm transition ${
                      currentIndex === i
                        ? 'bg-orange-500 text-white ring-2 ring-orange-600'
                        : isComplete
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-white text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botón de envío */}
          <div className="border-t pt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className={`w-full py-4 rounded-lg font-bold text-lg transition ${
                submitting || !title.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl'
              }`}
            >
              {submitting ? 'Creando examen...' : '✅ Crear Examen Oficial'}
            </button>
            
            {!isComplete && (
              <p className="text-center text-amber-600 text-sm mt-2">
                ⚠️ Asegúrate de completar todas las preguntas antes de crear el examen
              </p>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
