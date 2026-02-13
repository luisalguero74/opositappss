"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Questionnaire {
  id: string
  title: string
  type: string
  theme?: string | null
}

export default function AdminCreateQuestionPage() {
  const { data } = useSession()
  const session = data as Session | null
  const router = useRouter()

  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [questionnaireId, setQuestionnaireId] = useState("")
  const [text, setText] = useState("")
  const [optionA, setOptionA] = useState("")
  const [optionB, setOptionB] = useState("")
  const [optionC, setOptionC] = useState("")
  const [optionD, setOptionD] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("A")
  const [explanation, setExplanation] = useState("")
  const [temaCodigo, setTemaCodigo] = useState("")
  const [temaNumero, setTemaNumero] = useState<string>("")
  const [temaParte, setTemaParte] = useState("")
  const [temaTitulo, setTemaTitulo] = useState("")
  const [difficulty, setDifficulty] = useState("")

  useEffect(() => {
    if (!session || !session.user || String(session.user.role || "").toLowerCase() !== "admin") {
      return
    }
    loadQuestionnaires()
  }, [session, router])

  const loadQuestionnaires = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/questionnaires")
      if (!res.ok) {
        throw new Error("No se pudieron cargar los cuestionarios")
      }
      const data = await res.json()
      setQuestionnaires(data.questionnaires || data || [])
    } catch (err: any) {
      console.error("Error cargando cuestionarios:", err)
      setError(err?.message || "Error al cargar cuestionarios")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (!questionnaireId) {
      setError("Selecciona un cuestionario")
      return
    }
    if (!text.trim()) {
      setError("Introduce el enunciado de la pregunta")
      return
    }

    const options = [optionA, optionB, optionC, optionD]
    if (options.some(o => !o.trim())) {
      setError("Rellena las 4 opciones de respuesta")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionnaireId,
          text,
          options,
          correctAnswer,
          explanation,
          temaCodigo: temaCodigo || null,
          temaNumero: temaNumero ? Number(temaNumero) : null,
          temaParte: temaParte || null,
          temaTitulo: temaTitulo || null,
          difficulty: difficulty || null
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al crear la pregunta")
      }

      setMessage("✅ Pregunta creada correctamente")
      setText("")
      setOptionA("")
      setOptionB("")
      setOptionC("")
      setOptionD("")
      setCorrectAnswer("A")
      setExplanation("")
    } catch (err: any) {
      setError(err?.message || "Error al crear la pregunta")
    } finally {
      setSaving(false)
    }
  }

  if (!session || !session.user || String(session.user.role || "").toLowerCase() !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/questions"
            className="text-emerald-600 hover:text-emerald-800 font-semibold mb-2 inline-block"
          >
            ← Volver a Base de Preguntas
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">➕ Crear Pregunta Manualmente</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Rellena el formulario para añadir una pregunta directamente al banco oficial (tabla Question).
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {loading ? (
            <p className="text-gray-600">Cargando cuestionarios...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cuestionario destino</label>
                <select
                  value={questionnaireId}
                  onChange={(e) => setQuestionnaireId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Selecciona cuestionario</option>
                  {questionnaires.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Suele corresponder a un test de tema concreto o a un simulacro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Enunciado de la pregunta</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Escribe aquí el enunciado completo de la pregunta..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Opciones de respuesta</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold">A)</span>
                    <input
                      type="text"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold">B)</span>
                    <input
                      type="text"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold">C)</span>
                    <input
                      type="text"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-sm font-bold">D)</span>
                    <input
                      type="text"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Respuesta correcta</label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dificultad (opcional)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Sin especificar</option>
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Explicación (recomendado)</label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Incluye fundamento legal, artículo, y por qué las otras opciones son incorrectas."
                />
              </div>

              <div className="border rounded-xl border-dashed border-gray-300 p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Vinculación al temario (opcional, pero muy útil)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Código de tema (ej: T05, G01)</label>
                    <input
                      type="text"
                      value={temaCodigo}
                      onChange={(e) => setTemaCodigo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Número de tema (ej: 5)</label>
                    <input
                      type="number"
                      value={temaNumero}
                      onChange={(e) => setTemaNumero(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Parte (GENERAL / ESPECÍFICO)</label>
                    <input
                      type="text"
                      value={temaParte}
                      onChange={(e) => setTemaParte(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="GENERAL o ESPECÍFICO"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Título completo del tema</label>
                    <input
                      type="text"
                      value={temaTitulo}
                      onChange={(e) => setTemaTitulo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {message && (
                <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 whitespace-pre-line">
                  {message}
                </div>
              )}
              {error && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-line">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "💾 Guardar Pregunta"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
