'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Question {
  id: string
  text: string
  options: string
  correctAnswer: string
  explanation: string
}

interface PracticalCase {
  id: string
  title: string
  theme: string | null
  statement: string | null
  published: boolean
  questions: Question[]
}

export default function EditPracticalCase() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [practicalCase, setPracticalCase] = useState<PracticalCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingHTML, setGeneratingHTML] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      router.push('/dashboard')
    } else if (status === 'authenticated' && params.id) {
      loadPracticalCase()
    }
  }, [status, session, router, params.id])

  const loadPracticalCase = async () => {
    try {
      const res = await fetch(`/api/admin/practical-cases/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setPracticalCase(data.practicalCase)
      }
    } catch (error) {
      console.error('Error loading practical case:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!practicalCase) return

    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch(`/api/admin/practical-cases/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: practicalCase.title,
          theme: practicalCase.theme,
          statement: practicalCase.statement,
          questions: practicalCase.questions.map(q => ({
            id: q.id,
            text: q.text,
            options: JSON.parse(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }))
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Cambios guardados correctamente' })
      } else {
        setMessage({ type: 'error', text: 'Error al guardar cambios' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!practicalCase) return
    const updated = { ...practicalCase }
    if (field === 'options') {
      updated.questions[index].options = JSON.stringify(value)
    } else {
      (updated.questions[index] as any)[field] = value
    }
    setPracticalCase(updated)
  }

  const handleGenerateHTML = async () => {
    if (!practicalCase) return

    setGeneratingHTML(true)
    setMessage({ type: '', text: '' })

    try {
      const res = await fetch('/api/admin/generate-practical-form-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: practicalCase.title,
          theme: practicalCase.theme,
          statement: practicalCase.statement,
          questions: practicalCase.questions.map(q => ({
            text: q.text,
            options: JSON.parse(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }))
        })
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${practicalCase.title.replace(/\s+/g, '_')}_${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setMessage({ type: 'success', text: '✅ Formulario HTML generado y descargado correctamente' })
      } else {
        setMessage({ type: 'error', text: 'Error al generar el formulario HTML' })
      }
    } catch (error) {
      console.error('Error generating HTML:', error)
      setMessage({ type: 'error', text: 'Error de conexión al generar HTML' })
    } finally {
      setGeneratingHTML(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!practicalCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Supuesto práctico no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/admin/practical-cases" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">
            ← Volver a Supuestos Prácticos
          </Link>
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✏️</div>
              <h1 className="text-4xl font-bold text-white">Editar Supuesto Práctico</h1>
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

        {/* Información general */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Información General</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Título</label>
              <input
                type="text"
                value={practicalCase.title}
                onChange={(e) => setPracticalCase({ ...practicalCase, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Tema</label>
              <input
                type="text"
                value={practicalCase.theme || ''}
                onChange={(e) => setPracticalCase({ ...practicalCase, theme: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Ej: Tema 5 del Específico"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Enunciado del Supuesto</label>
            <textarea
              value={practicalCase.statement || ''}
              onChange={(e) => setPracticalCase({ ...practicalCase, statement: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
              rows={10}
              placeholder="Describe el caso práctico completo aquí..."
            />
          </div>
        </div>

        {/* Preguntas */}
        <div className="space-y-6 mb-6">
          {practicalCase.questions.map((question, index) => {
            const options = JSON.parse(question.options)
            return (
              <div key={question.id} className="bg-white rounded-2xl shadow-xl p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Pregunta {index + 1}
                </h3>

                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Texto de la pregunta</label>
                  <textarea
                    value={question.text}
                    onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {['A', 'B', 'C', 'D'].map((letter, optIndex) => (
                    <div key={letter}>
                      <label className="block text-gray-700 font-semibold mb-2">Opción {letter}</label>
                      <input
                        type="text"
                        value={options[optIndex] || ''}
                        onChange={(e) => {
                          const newOptions = [...options]
                          newOptions[optIndex] = e.target.value
                          updateQuestion(index, 'options', newOptions)
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Respuesta Correcta</label>
                  <select
                    value={question.correctAnswer}
                    onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Motivación (Explicación técnica con referencias legales)
                  </label>
                  <textarea
                    value={question.explanation}
                    onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                    rows={4}
                    placeholder="Conforme al artículo X del Real Decreto Y, de DD de mes de AAAA..."
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold py-4 rounded-lg hover:from-orange-700 hover:to-red-700 transition disabled:opacity-50"
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>

          <button
            onClick={handleGenerateHTML}
            disabled={generatingHTML}
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
          >
            {generatingHTML ? '⏳ Generando...' : '📄 Generar Formulario HTML'}
          </button>
          
          <Link
            href="/admin/practical-cases"
            className="px-8 py-4 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition text-center"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  )
}
