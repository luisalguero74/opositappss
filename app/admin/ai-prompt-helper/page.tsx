"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { TEMARIO_OFICIAL } from "@/lib/temario-oficial"

type TaskType = "generate" | "review"

type Difficulty = "baja" | "media" | "alta"

export default function AIPromptHelperPage() {
  const { data: session } = useSession() as { data: Session | null }
  const router = useRouter()

  const [taskType, setTaskType] = useState<TaskType>("generate")
  const [categoria, setCategoria] = useState<"general" | "especifico">("especifico")
  const [temaId, setTemaId] = useState<string>("")
  const [textoLegal, setTextoLegal] = useState("")
  const [numPreguntas, setNumPreguntas] = useState(10)
  const [difficulty, setDifficulty] = useState<Difficulty>("alta")
  const [incluirExplicaciones, setIncluirExplicaciones] = useState(true)
  const [outputPrompt, setOutputPrompt] = useState("")

  useEffect(() => {
    if (session && session.user && String(session.user.role || "").toLowerCase() !== "admin") {
      router.push("/dashboard")
    }
  }, [session, router])

  const temasFiltrados = TEMARIO_OFICIAL.filter((t) => t.categoria === categoria)
  const temaSeleccionado = temasFiltrados.find((t) => t.id === temaId) || null

  const buildPrompt = () => {
    if (!textoLegal.trim()) {
      alert("Pega primero el texto legal oficial (BOE, reglamento, etc.)")
      return
    }

    const dificultadTexto =
      difficulty === "baja" ? "baja (muy básicas, de recuerdo)" :
      difficulty === "media" ? "media (comprensión e ideas clave)" :
      "alta (matices, detalles finos y excepciones)"

    const temaLinea = temaSeleccionado
      ? `Tema: ${temaSeleccionado.numero} - ${temaSeleccionado.titulo}. Categoría: ${temaSeleccionado.categoria.toUpperCase()}.`
      : `Tema: [indicar tema concreto dentro del temario oficial].`

    if (taskType === "generate") {
      const base = `Eres un experto en oposiciones de la Administración de la Seguridad Social (Cuerpo Administrativo, C1).
Tu tarea es crear preguntas tipo test de MÁXIMA CALIDAD a partir del siguiente texto legal oficial.

${temaLinea}

TEXTO LEGAL OFICIAL (ÚNICA FUENTE, NO INVENTES NADA):
"""
${textoLegal.trim()}
"""

OBJETIVO:
- Generar exactamente ${numPreguntas} preguntas tipo test.
- Cada pregunta debe poder justificarse DIRECTAMENTE con el texto anterior.
- La dificultad global debe ser: ${dificultadTexto}.

INSTRUCCIONES GENERALES:
1. NO utilices conocimientos fuera del texto legal pegado. Si algo no está en este texto, no lo menciones.
2. Debe haber UNA sola opción claramente correcta por pregunta.
3. Evita ambigüedades: si el texto no es claro, no generes la pregunta.
4. Evita preguntas puramente de memoria absurda (números sueltos sin contexto), salvo que en este tema sea imprescindible.
5. Usa formulaciones claras, sin dobles negaciones salvo que el artículo esté redactado así.
6. DISTRIBUYE las respuestas correctas entre A, B, C y D: en el conjunto de preguntas ninguna letra debe aparecer siempre como correcta y no puede haber más de 2 preguntas seguidas con la misma letra.

FORMATO DE SALIDA (COMPATIBLE CON IMPORTADOR JSON):
- Devuelve SOLO JSON válido, sin texto adicional.
- Estructura exacta:
{
  "data": [
    {
      "questions": [
        {
          "text": "Texto de la pregunta (en español)",
          "options": ["A) Opción A", "B) Opción B", "C) Opción C", "D) Opción D"],
          "correctAnswer": "A",
          "explanation": "Explicación detallada",${incluirExplicaciones ? "" : " // Puedes dejar esto como cadena vacía \"\""}
          "difficulty": "dificil",
          "temaCodigo": "${temaSeleccionado ? temaSeleccionado.id.toUpperCase() : 'SIN_TEMA'}",
          "temaNumero": ${temaSeleccionado ? temaSeleccionado.numero : 'null'},
          "temaParte": "${categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO'}",
          "temaTitulo": "${temaSeleccionado ? temaSeleccionado.titulo : ''}"
        }
      ]
    }
  ]
}

IMPORTANTE FORMATO:
- Las opciones deben incluir el prefijo A), B), C), D)
- difficulty debe ser: "facil", "media" o "dificil" (en español)
- temaCodigo: código del tema (G1, E5, etc.)
- Este JSON es directamente importable en /admin/import-questions

REQUISITOS SOBRE EXPLICACIONES:
- Cita SIEMPRE el artículo exacto y, si es posible, el apartado (ej.: "art. 3.2 del Reglamento general de recaudación").
- Incluye entre comillas al menos una frase casi literal del texto legal que justifique la respuesta.
- Indica brevemente por qué las otras opciones son incorrectas, haciendo referencia al texto.
- Si NO puedes justificar una respuesta con el texto dado, NO generes esa pregunta.

VALIDACIÓN INTERNA (OBLIGATORIA):
- Antes de devolver el JSON, asegúrate de que:
  - Todas las preguntas se basan en frases concretas del texto.
  - Cada pregunta tiene 4 opciones y solo una es correcta.
  - No repites prácticamente la misma pregunta con redacciones mínimamente cambiadas.
  - La distribución de respuestas correctas entre A/B/C/D está equilibrada (no pongas siempre la misma letra ni más de 2 seguidas).
`

      setOutputPrompt(base)
      return
    }

    // Modo REVISAR preguntas existentes
    const review = `Eres un revisor experto de preguntas tipo test de oposiciones de la Administración de la Seguridad Social.
Debes auditar la calidad jurídica de un bloque de preguntas ya creadas, comparándolas con el texto legal oficial.

${temaLinea}

TEXTO LEGAL OFICIAL (REFERENCIA ÚNICA):
"""
${textoLegal.trim()}
"""

INSTRUCCIONES:
1. Te voy a proporcionar un bloque de preguntas tipo test ya redactadas (en otro mensaje), con sus opciones y respuesta marcada como correcta.
2. Para CADA pregunta, debes indicar:
   - Si la referencia legal es correcta y existe tal como se menciona.
   - Si la respuesta marcada como correcta es realmente correcta según el texto legal anterior.
   - Si hay más de una opción potencialmente correcta o el enunciado es ambiguo.
   - Si la explicación (si existe) está alineada literalmente con el texto legal o inventa cosas.
3. Proporciona un dictamen claro por pregunta: "válida" / "corregir" / "descartar" y una breve justificación.
4. Si detectas inventos o referencias legales inexistentes, márcalo como ERROR GRAVE.

FORMATO DE SALIDA SUGERIDO (LIBRE, PERO ORDENADO):
- Para cada pregunta:
  - Número o identificador
  - Estado: válida / corregir / descartar
  - Problemas detectados (si los hay)
  - Propuesta de redacción mejorada, si procede

MUY IMPORTANTE:
- Si no estás 100% seguro de un número de artículo o de una referencia concreta, NO lo inventes. Indica "referencia pendiente de verificar".
`

    setOutputPrompt(review)
  }

  if (!session || !session.user || String(session.user.role || "").toLowerCase() !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <p className="text-xl text-gray-700">No autorizado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-purple-600 hover:text-purple-800 font-semibold mb-4 inline-block"
          >
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 shadow-2xl text-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-5xl mb-3">🧭</div>
                <h1 className="text-3xl font-bold">Asistente de Prompts IA</h1>
                <p className="text-purple-100 mt-2">
                  Genera un prompt estructurado para hablar conmigo (IA) de forma clara, basada en texto legal oficial.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Tipo de tarea</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="button"
              onClick={() => setTaskType("generate")}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-left text-sm font-semibold transition ${
                taskType === "generate"
                  ? "border-purple-500 bg-purple-50 text-purple-800"
                  : "border-gray-200 hover:border-purple-300 text-gray-700"
              }`}
            >
              <div className="text-lg mb-1">🧪 Generar preguntas nuevas</div>
              <p className="text-xs text-gray-600">
                A partir de artículos del BOE / reglamentos, crea preguntas tipo test de alta calidad.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTaskType("review")}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-left text-sm font-semibold transition ${
                taskType === "review"
                  ? "border-purple-500 bg-purple-50 text-purple-800"
                  : "border-gray-200 hover:border-purple-300 text-gray-700"
              }`}
            >
              <div className="text-lg mb-1">🔍 Revisar preguntas existentes</div>
              <p className="text-xs text-gray-600">
                Usar el texto legal como referencia y auditar preguntas ya redactadas.
              </p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">2. Tema y parámetros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Parte del temario</label>
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value as "general" | "especifico")
                  setTemaId("")
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="general">Parte general</option>
                <option value="especifico">Parte específica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tema (opcional pero recomendado)</label>
              <select
                value={temaId}
                onChange={(e) => setTemaId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Selecciona un tema (o deja vacío)</option>
                {temasFiltrados.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.numero}. {t.titulo}
                  </option>
                ))}
              </select>
            </div>

            {taskType === "generate" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Número de preguntas</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={numPreguntas}
                  onChange={(e) => setNumPreguntas(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Dificultad objetivo</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          {taskType === "generate" && (
            <div className="flex items-center gap-2 mt-2">
              <input
                id="explicaciones"
                type="checkbox"
                checked={incluirExplicaciones}
                onChange={(e) => setIncluirExplicaciones(e.target.checked)}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded"
              />
              <label htmlFor="explicaciones" className="text-sm text-gray-700">
                Incluir instrucciones para generar explicaciones completas ahora
              </label>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-3">3. Pega aquí el texto legal oficial</h2>
          <p className="text-xs text-gray-500 mb-2">
            Copia literalmente el artículo o artículos del BOE, reglamento, LGSS, etc. Cuanto más preciso, mejor calidad de preguntas.
          </p>
          <textarea
            value={textoLegal}
            onChange={(e) => setTextoLegal(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="Pega aquí el artículo o fragmento oficial del BOE / reglamento..."
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800">4. Generar prompt</h2>
            <button
              type="button"
              onClick={buildPrompt}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-indigo-700"
            >
              Generar texto para la IA
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Pulsa el botón y luego copia el resultado en el chat de la IA (por ejemplo, en esta misma conversación de trabajo).
          </p>
          <textarea
            value={outputPrompt}
            onChange={(e) => setOutputPrompt(e.target.value)}
            rows={18}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            placeholder="Aquí aparecerá el prompt estructurado listo para copiar y pegar..."
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                if (!outputPrompt) return
                navigator.clipboard.writeText(outputPrompt).catch(() => {
                  alert("No se pudo copiar al portapapeles. Copia manualmente.")
                })
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
            >
              Copiar al portapapeles
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-900">
          <h3 className="font-bold mb-1">Sugerencia de flujo de trabajo</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Selecciona tema y tipo de tarea.</li>
            <li>Pega el artículo o fragmento legal exacto.</li>
            <li>Genera el prompt y cópialo a la conversación con la IA.</li>
            <li>Revisa las preguntas generadas y, si es necesario, pásalas por tu propio filtro antes de importarlas al banco.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
