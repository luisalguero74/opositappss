import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'
import { logError } from '@/lib/error-logger'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function ensureQuestionTimestampColumns() {
  // Production DB may be out of sync (legacy tables without timestamps).
  // Use IF NOT EXISTS and ignore "table does not exist" errors.
  const statements = [
    'ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()',
    'ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()',
    'ALTER TABLE question ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()',
    'ALTER TABLE question ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()'
  ]

  for (const sql of statements) {
    try {
      // eslint-disable-next-line prisma/no-raw-queries
      await prisma.$executeRawUnsafe(sql)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // 42P01 = undefined_table
      if (message.includes('42P01') || message.toLowerCase().includes('does not exist')) {
        continue
      }
      // If we hit any other error, surface it to logs but don't hard-fail generation.
      // The subsequent inserts will fail with a clearer Prisma error if the schema is still wrong.
      console.error('Error ensuring Question timestamp columns', {
        error: message,
        sql
      })
    }
  }
}

async function groqChatJsonObject(prompt: string, maxTokens: number) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada')
  }

  const controller = new AbortController()
  // Keep this below typical serverless limits so we fail with JSON (not a 504 HTML/text timeout)
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto jurídico en oposiciones. Respondes siempre en JSON válido y bien formado.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Groq API error: ${response.status} ${response.statusText} ${text}`.trim())
    }

    const data = (await response.json()) as any
    const content = data?.choices?.[0]?.message?.content
    if (!content || typeof content !== 'string') {
      throw new Error('Groq devolvió una respuesta vacía')
    }

    return content
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Timeout llamando a Groq (12s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

type GenerateAction = 'start' | 'chunk'

type ChunkResponse = {
  message: string
  questionnaireId: string
  categoria: 'general' | 'especifico' | 'lgss'
  temasTotal: number
  temasProcesados?: number
  preguntasGeneradas?: number
  temaIndex?: number
  temaId?: string
  temaNumero?: number
  doneForTema?: boolean
  remainingForTema?: number
  inserted?: number
}

async function getOrCreateQuestionnaire(params: {
  categoria: 'general' | 'especifico' | 'lgss'
  questionnaireId?: string
}) {
  if (params.questionnaireId) {
    const existing = await prisma.questionnaire.findUnique({
      where: { id: params.questionnaireId },
      select: { id: true }
    })
    if (!existing) {
      throw new Error('questionnaireId inválido o no existe')
    }
    return params.questionnaireId
  }

  const titleBase =
    params.categoria === 'general'
      ? 'Temario General'
      : params.categoria === 'especifico'
        ? 'Temario Específico'
        : 'LGSS (RDL 8/2015)'

  const questionnaire = await prisma.questionnaire.create({
    data: {
      title: `${titleBase} - ${new Date().toLocaleDateString()}`,
      type: 'theory',
      published: false,
      statement:
        params.categoria === 'lgss'
          ? 'Preguntas sobre la Ley General de la Seguridad Social - Real Decreto Legislativo 8/2015'
          : undefined
    }
  })

  return questionnaire.id
}

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

type GeneracionTemaResult = {
  preguntas: PreguntaGenerada[]
  error?: string
}

// Función para calcular similitud entre textos (Jaccard Index)
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '').trim()
  const words1 = new Set(normalize(text1).split(/\s+/))
  const words2 = new Set(normalize(text2).split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  return union.size === 0 ? 0 : intersection.size / union.size
}

// Filtrar preguntas duplicadas o muy similares
function filtrarDuplicadosPorSimilaridad(
  preguntasNuevas: PreguntaGenerada[],
  preguntasExistentes: string[]
): PreguntaGenerada[] {
  const SIMILARITY_THRESHOLD = 0.7 // 70% de palabras en común = duplicado
  
  const resultado: PreguntaGenerada[] = []
  
  for (const pregunta of preguntasNuevas) {
    // Verificar duplicados exactos
    if (preguntasExistentes.some(existing => 
      existing.toLowerCase().trim() === pregunta.pregunta.toLowerCase().trim()
    )) {
      console.log(`      🚫 Duplicado exacto: ${pregunta.pregunta.substring(0, 60)}...`)
      continue
    }
    
    // Verificar preguntas muy similares con existentes
    const esSimilarAExistente = preguntasExistentes.some(existing => {
      const similarity = calculateSimilarity(existing, pregunta.pregunta)
      if (similarity >= SIMILARITY_THRESHOLD) {
        console.log(`      🚫 Similar ${Math.round(similarity * 100)}%: ${pregunta.pregunta.substring(0, 60)}...`)
        return true
      }
      return false
    })
    
    if (esSimilarAExistente) continue
    
    // Verificar duplicados dentro del mismo lote
    const esSimilarEnLote = resultado.some(existing => 
      calculateSimilarity(existing.pregunta, pregunta.pregunta) >= SIMILARITY_THRESHOLD
    )
    
    if (!esSimilarEnLote) {
      resultado.push(pregunta)
    } else {
      console.log(`      🚫 Duplicado en lote: ${pregunta.pregunta.substring(0, 60)}...`)
    }
  }
  
  return resultado
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    if (!isVercelCron) {
      if (!session || session.user.role?.toLowerCase() !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    await ensureQuestionTimestampColumns()

    const body = await req.json().catch(() => ({}))
    const categoria = body?.categoria as 'general' | 'especifico' | 'lgss'
    const preguntasPorTema = Number(body?.preguntasPorTema ?? 20)
    const action = (body?.action as GenerateAction | undefined) ?? 'start'
    const questionnaireId = body?.questionnaireId as string | undefined
    const temaIndex =
      typeof body?.temaIndex === 'number' && Number.isFinite(body.temaIndex)
        ? Math.max(0, Math.floor(body.temaIndex))
        : undefined
    const preguntasChunkSize =
      typeof body?.preguntasChunkSize === 'number' && Number.isFinite(body.preguntasChunkSize)
        ? Math.max(1, Math.min(10, Math.floor(body.preguntasChunkSize)))
        : 5

    if (!categoria || !['general', 'especifico', 'lgss'].includes(categoria)) {
      return NextResponse.json(
        { error: 'Categoría inválida. Usa "general", "especifico" o "lgss"' },
        { status: 400 }
      )
    }

    // Evitar “éxito” silencioso si falta la API key: sin Groq no se generan preguntas.
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: 'No se puede generar: falta GROQ_API_KEY',
          details:
            'Configura GROQ_API_KEY en Vercel (Environment Variables) y redeploy. Sin esta clave, el generador no puede crear preguntas.'
        },
        { status: 500 }
      )
    }

    // Chunked generation (to avoid Vercel FUNCTION_INVOCATION_TIMEOUT)
    if (action === 'start') {
      if (categoria === 'lgss') {
        const id = await getOrCreateQuestionnaire({ categoria, questionnaireId })
        const response: ChunkResponse = {
          message: 'Inicio generación LGSS (modo chunks)',
          questionnaireId: id,
          categoria,
          temasTotal: 1
        }
        return NextResponse.json(response)
      }

      const temasFiltrados = TEMARIO_OFICIAL.filter(t => t.categoria === categoria)
      const id = await getOrCreateQuestionnaire({ categoria, questionnaireId })
      const response: ChunkResponse = {
        message: 'Inicio generación masiva (modo chunks)',
        questionnaireId: id,
        categoria,
        temasTotal: temasFiltrados.length
      }
      return NextResponse.json(response)
    }

    // action === 'chunk'
    const qid = await getOrCreateQuestionnaire({ categoria, questionnaireId })

    if (categoria === 'lgss') {
      const already = await prisma.question.count({
        where: {
          questionnaireId: qid,
          temaCodigo: 'LGSS',
          temaParte: 'LGSS'
        }
      })
      const remaining = Math.max(0, preguntasPorTema - already)
      if (remaining === 0) {
        const response: ChunkResponse = {
          message: 'LGSS completado',
          questionnaireId: qid,
          categoria,
          temasTotal: 1,
          temasProcesados: 1,
          preguntasGeneradas: already,
          doneForTema: true,
          remainingForTema: 0,
          inserted: 0
        }
        return NextResponse.json(response)
      }

      const toGenerate = Math.min(preguntasChunkSize, remaining)
      const preguntasLGSS = await generarPreguntasLGSS(toGenerate)
      if (preguntasLGSS.length === 0) {
        return NextResponse.json(
          {
            error: 'No se pudo generar preguntas sobre LGSS (chunk)',
            details: 'Groq devolvió 0 preguntas o hubo un error. Revisa logs y cuota.'
          },
          { status: 500 }
        )
      }

      let inserted = 0
      for (const p of preguntasLGSS) {
        if (!p?.pregunta || !Array.isArray(p?.opciones) || p.opciones.length < 2) continue
        const idx = typeof p.respuestaCorrecta === 'number' ? p.respuestaCorrecta : 0
        const correctAnswer = ['A', 'B', 'C', 'D'][Math.min(Math.max(idx, 0), 3)]

        // Buscar temaId para LGSS (si existe en TemaOficial)
        const temaLGSS = await prisma.temaOficial.findFirst({
          where: { id: 'LGSS' }
        })
        
        await prisma.question.create({
          data: {
            questionnaireId: qid,
            text: p.pregunta,
            options: JSON.stringify(p.opciones),
            correctAnswer,
            explanation: p.explicacion,
            temaId: temaLGSS?.id || null,
            temaCodigo: 'LGSS',
            temaNumero: 0,
            temaParte: 'LGSS',
            temaTitulo: 'Ley General de la Seguridad Social (RDL 8/2015)',
            difficulty: p.dificultad
          }
        })
        inserted += 1
      }

      const after = already + inserted
      const remainingAfter = Math.max(0, preguntasPorTema - after)

      const response: ChunkResponse = {
        message: 'LGSS chunk completado',
        questionnaireId: qid,
        categoria,
        temasTotal: 1,
        temasProcesados: remainingAfter === 0 ? 1 : 0,
        preguntasGeneradas: after,
        doneForTema: remainingAfter === 0,
        remainingForTema: remainingAfter,
        inserted
      }
      return NextResponse.json(response)
    }

    if (temaIndex === undefined) {
      return NextResponse.json(
        { error: 'Falta temaIndex para action=chunk' },
        { status: 400 }
      )
    }

    const temasFiltrados = TEMARIO_OFICIAL.filter(t => t.categoria === categoria)
    const temaParte = categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO'

    if (temaIndex < 0 || temaIndex >= temasFiltrados.length) {
      return NextResponse.json(
        { error: 'temaIndex fuera de rango' },
        { status: 400 }
      )
    }

    const tema = temasFiltrados[temaIndex]

    // How many we already inserted into THIS questionnaire for this tema
    const alreadyInQuestionnaire = await prisma.question.count({
      where: {
        questionnaireId: qid,
        temaCodigo: tema.id,
        temaParte
      }
    })

    const remainingForTema = Math.max(0, preguntasPorTema - alreadyInQuestionnaire)
    if (remainingForTema === 0) {
      const response: ChunkResponse = {
        message: 'Tema ya completado',
        questionnaireId: qid,
        categoria,
        temasTotal: temasFiltrados.length,
        temaIndex,
        temaId: tema.id,
        temaNumero: tema.numero,
        doneForTema: true,
        remainingForTema: 0,
        inserted: 0
      }
      return NextResponse.json(response)
    }

    // OPTIMIZACIÓN: Solo cargar las últimas 100 preguntas para reducir egress
    // Esto reduce significativamente la transferencia de datos desde Supabase
    const existentes = await prisma.question.findMany({
      where: {
        temaCodigo: tema.id,
        temaParte
      },
      select: { text: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    const preguntasExistentes = existentes
      .map(p => p.text)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)

    const toGenerate = Math.min(preguntasChunkSize, remainingForTema)

    const resultadoIA = await generarPreguntasParaTema(
      tema.id,
      tema.numero,
      tema.titulo,
      tema.descripcion,
      categoria,
      toGenerate,
      preguntasExistentes
    )

    if (resultadoIA.error) {
      return NextResponse.json(
        {
          error: 'Error al generar preguntas',
          details: resultadoIA.error,
          questionnaireId: qid,
          categoria,
          temasTotal: temasFiltrados.length,
          temaIndex,
          temaId: tema.id,
          temaNumero: tema.numero
        },
        { status: 500 }
      )
    }

    const generadas = resultadoIA.preguntas
    const filtradas = filtrarDuplicadosPorSimilaridad(generadas, preguntasExistentes)
    if (filtradas.length === 0) {
      const response: ChunkResponse = {
        message: 'Chunk sin preguntas válidas (duplicadas o vacías)',
        questionnaireId: qid,
        categoria,
        temasTotal: temasFiltrados.length,
        temaIndex,
        temaId: tema.id,
        temaNumero: tema.numero,
        doneForTema: false,
        remainingForTema,
        inserted: 0
      }
      return NextResponse.json(response)
    }

    let inserted = 0
    for (const p of filtradas) {
      if (!p?.pregunta || !Array.isArray(p?.opciones) || p.opciones.length < 2) continue
      const idx = typeof p.respuestaCorrecta === 'number' ? p.respuestaCorrecta : 0
      const correctAnswer = ['A', 'B', 'C', 'D'][Math.min(Math.max(idx, 0), 3)]

      // Buscar temaId en TemaOficial
      const temaOficial = await prisma.temaOficial.findFirst({
        where: {
          OR: [
            { id: tema.id },
            { AND: [{ categoria: categoria === 'general' ? 'GENERAL' : 'ESPECIFICO' }, { numero: tema.numero }] }
          ]
        }
      })
      
      await prisma.question.create({
        data: {
          questionnaireId: qid,
          text: p.pregunta,
          options: JSON.stringify(p.opciones),
          correctAnswer,
          explanation: p.explicacion,
          temaId: temaOficial?.id || null,
          temaCodigo: tema.id,
          temaNumero: tema.numero,
          temaParte,
          temaTitulo: tema.titulo,
          difficulty: p.dificultad
        }
      })
      inserted += 1
    }

    const after = alreadyInQuestionnaire + inserted
    const remainingAfter = Math.max(0, preguntasPorTema - after)

    const response: ChunkResponse = {
      message: 'Chunk completado',
      questionnaireId: qid,
      categoria,
      temasTotal: temasFiltrados.length,
      temaIndex,
      temaId: tema.id,
      temaNumero: tema.numero,
      doneForTema: remainingAfter === 0,
      remainingForTema: remainingAfter,
      inserted
    }
    return NextResponse.json(response)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[Bulk Generate] Error:', error)

    await logError({
      errorType: 'API_ERROR',
      severity: 'high',
      endpoint: 'POST /api/admin/generate-bulk-questions',
      statusCode: 500,
      message: `Bulk question generation failed: ${errorMessage}`,
      stack: errorStack,
      context: {
        operation: 'generate-bulk-questions'
      },
      notifyAdmin: true
    }).catch((logErr) => {
      console.error('[Bulk Generate] Failed to log error:', logErr)
    })

    return NextResponse.json(
      {
        error: 'Error al generar preguntas',
        details: errorMessage || 'Sin detalles. Revisa los logs del servidor para más información.'
      },
      { status: 500 }
    )
  }
}

// Función auxiliar para normalizar valores de dificultad
function normalizarDificultad(valor: string): 'facil' | 'media' | 'dificil' {
  const normalizado = valor?.toLowerCase().trim() || 'media'
  
  if (normalizado.includes('facil') || normalizado.includes('fácil') || normalizado.includes('baja') || normalizado.includes('easy')) {
    return 'facil'
  }
  if (normalizado.includes('dificil') || normalizado.includes('difícil') || normalizado.includes('alta') || normalizado.includes('hard')) {
    return 'dificil'
  }
  return 'media'
}

async function generarPreguntasLGSS(
  numPreguntas: number = 30
): Promise<PreguntaGenerada[]> {
  
  console.log(`[LGSS] Iniciando generación de ${numPreguntas} preguntas sobre LGSS RDL 8/2015...`)
  
  // Validar que Groq API Key esté disponible
  if (!process.env.GROQ_API_KEY) {
    console.error('[LGSS] ❌ GROQ_API_KEY no está definida en variables de entorno')
    return []
  }
  
  const prompt = `CONTEXTO: Eres un EXPERTO JURÍDICO especializado en la Ley General de la Seguridad Social (RDL 8/2015), con amplia experiencia en la elaboración de preguntas para los exámenes oficiales de oposiciones al Cuerpo General Administrativo de la Seguridad Social.

OBJETIVO: Generar ${numPreguntas} preguntas tipo test profesionales basadas en exámenes oficiales reales de los últimos años (2022-2025).

ESTÁNDAR DE CALIDAD:
- Las preguntas deben tener el mismo nivel de rigor y complejidad que los exámenes oficiales
- Lenguaje estrictamente profesional y legal
- Referencias precisas a artículos, apartados y párrafos específicos del RDL 8/2015
- Inclusión de normativa relacionada: Real Decreto 1606/1985, Orden de 6 de abril de 1990, etc.
- Las opciones incorrectas deben basarse en errores comunes o confusiones reales del alumnado

TEMAS PRINCIPALES (distribuye preguntas uniformemente):
1. Objeto y ámbito de aplicación de la LGSS (Art. 1-5)
2. Regímenes de la Seguridad Social (Art. 6-73) - General, Especiales, Autónomos
3. Afiliación a la Seguridad Social (Art. 74-125) - Alta, Baja, Variaciones
4. Cotización: bases, porcentajes y responsables (Art. 129-145)
5. Recaudación, gestión de cuotas y bases de cotización (Art. 146-175)
6. Estructura administrativa de la Seguridad Social (Art. 176-190)
7. Prestaciones por Jubilación (Art. 199-216) - Ordinaria, anticipada, flexible
8. Prestaciones por Incapacidad Temporal (Art. 128-135)
9. Prestaciones por Incapacidad Permanente (Art. 137-151)
10. Prestaciones por muerte y supervivencia (Art. 220-240)
11. Prestaciones familiares y maternidad/paternidad (Art. 177-198)
12. Desempleo, accidentes de trabajo y enfermedades profesionales (Art. 200-219)

REQUISITOS OBLIGATORIOS:
✓ 4 opciones por pregunta (UNA SOLA correcta)
✓ Lenguaje completamente legal y profesional
✓ CADA EXPLICACIÓN DEBE INCLUIR:
  - Referencia específica: "Artículo X, apartado Y del RDL 8/2015"
  - Cita textual o paráfrasis precisa de la normativa
  - Normativa complementaria si aplica (Órdenes Ministeriales, RR.DD., etc.)
  - Explicación del porqué de la respuesta y por qué son incorrectas las otras opciones
✓ Distribución de dificultad: 30% fácil, 50% media, 20% difícil
✓ Las opciones incorrectas deben ser "distractores plausibles" basados en:
  - Interpretaciones erróneas de la normativa
  - Confusión con otros regímenes o prestaciones
  - Datos que casi cumplen requisitos pero con pequeñas diferencias
✓ Varía la posición de la respuesta correcta (no siempre en la opción A)

EJEMPLOS DE PREGUNTAS DE EXÁMENES REALES (estilo a seguir):
"Según el artículo 129 del RDL 8/2015, ¿cuál es la base mínima de cotización en el régimen general para el año 2025?"
"De conformidad con el artículo 15 de la Orden de 6 de abril de 1990, ¿qué sucede con la afiliación de un trabajador que cambia de actividad dentro de la misma empresa?"
"A tenor de lo establecido en el artículo 199 del RDL 8/2015, ¿cuál es el período mínimo de cotización necesario para causar derecho a jubilación ordinaria?"

FORMATO JSON OBLIGATORIO (es CRÍTICO - DEBE SER JSON VÁLIDO):
⚠️ IMPORTANTE: El campo "opciones" DEBE ser un ARRAY de strings, NO un string.
⚠️ NUNCA escribas: "opciones": "A) ..., B) ..., C) ..., D) ..."
✓ SIEMPRE escribe: "opciones": ["A) ...", "B) ...", "C) ...", "D) ..."]

{
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta en formato oficial de examen",
      "opciones": [
        "A) Opción A con datos/normas específicas",
        "B) Opción B con error plausible",
        "C) Opción C con confusión común",
        "D) Opción D con dato similar pero incorrecto"
      ],
      "respuestaCorrecta": 0,
      "explicacion": "Artículo X, apartado Y del RDL 8/2015: [cita textual]. Por lo tanto, la respuesta correcta es A porque... Las opciones B, C y D son incorrectas porque... [referencias complementarias si aplica]",
      "dificultad": "media"
    }
  ]
}

INSTRUCCIONES FINALES:
- Responde SOLO con el array JSON válido, sin texto adicional
- Verifica que el JSON sea parseable
- Asegúrate de que las explicaciones sean exhaustivas con referencias exactas
- dificultad: "facil", "media" o "dificil"
- respuestaCorrecta: 0=A, 1=B, 2=C, 3=D
`;

  try {
    console.log('[LGSS] Llamando a Groq API (fetch)...')
    const responseText = await groqChatJsonObject(prompt, 4000)
    console.log('[LGSS] Respuesta recibida de Groq, longitud:', responseText.length)

    let parsed: any
    try {
      parsed = JSON.parse(responseText.trim())
    } catch (parseError) {
      console.error('[LGSS] Error parseando JSON:', parseError)
      console.log('[LGSS] Respuesta recibida (primeros 500 caracteres):', responseText.substring(0, 500))
      return []
    }

    const preguntasRaw = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.preguntas)
        ? parsed.preguntas
        : Array.isArray(parsed?.questions)
          ? parsed.questions
          : []

    if (!Array.isArray(preguntasRaw) || preguntasRaw.length === 0) {
      console.error('[LGSS] Respuesta no contiene preguntas')
      return []
    }

    const preguntas = preguntasRaw.map((p: any) => ({
      pregunta: p.pregunta || p.question || p.text,
      opciones: p.opciones || p.options || [],
      respuestaCorrecta: typeof p.respuestaCorrecta === 'number' ? p.respuestaCorrecta : (p.correctAnswer || 0),
      explicacion: p.explicacion || p.explanation || '',
      dificultad: normalizarDificultad((p.dificultad || p.difficulty || 'media') as string)
    })) as PreguntaGenerada[]

    console.log(`[LGSS] ✅ Generadas ${preguntas.length} preguntas sobre LGSS exitosamente`)
    return preguntas
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[LGSS] Error generando preguntas LGSS:', error)
    if (error instanceof Error) {
      console.error('[LGSS] Detalles del error:', error.message)
      console.error('[LGSS] Stack:', error.stack)
    }
    
    // Registrar error en sistema de monitoreo
    await logError({
      errorType: 'EXTERNAL_SERVICE_ERROR',
      severity: 'high',
      endpoint: 'POST /api/admin/generate-bulk-questions (LGSS)',
      message: `LGSS question generation failed: ${errorMessage}`,
      stack: errorStack,
      context: {
        service: 'Groq',
        operation: 'generarPreguntasLGSS',
        numPreguntas
      },
      notifyAdmin: true
    }).catch((logErr) => {
      console.error('[LGSS] Failed to log error:', logErr)
    })
    
    return []
  }
}

async function generarPreguntasParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico',
  numPreguntas: number = 20,
  preguntasExistentes: string[] = []
): Promise<GeneracionTemaResult> {
  
  // Construir texto con preguntas existentes para evitar duplicados
  // OPTIMIZACIÓN: Solo mostrar 20 preguntas para reducir tamaño del prompt
  let seccionPreguntasExistentes = ''
  if (preguntasExistentes.length > 0) {
    const preguntasMostrar = preguntasExistentes.slice(0, 20) // Mostrar hasta 20 preguntas
    seccionPreguntasExistentes = `

⚠️ PREGUNTAS YA EXISTENTES DE ESTE TEMA (${preguntasExistentes.length} en total):
${preguntasMostrar.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${preguntasExistentes.length > 20 ? '\n... y ' + (preguntasExistentes.length - 20) + ' más.' : ''}

🚫 IMPORTANTE: NO REPITAS ni REFORMULES ninguna de estas preguntas existentes.
Genera preguntas COMPLETAMENTE NUEVAS sobre aspectos diferentes del tema.
`
  }

  const prompt = `CONTEXTO: Eres un EXPERTO en la elaboración de preguntas para exámenes oficiales de oposiciones al Cuerpo General Administrativo de la Seguridad Social. Tienes experiencia en exámenes reales de 2022-2025.

OBJETIVO: Generar ${numPreguntas} preguntas tipo test basadas en ${categoria === 'general' ? 'Temario General (Constitución, Administración Pública, etc.)' : 'Temario Específico (Seguridad Social, Derecho Laboral, etc.)'} con el máximo rigor académico y profesional.

TEMA A TRABAJAR:
- NÚMERO: Tema ${temaNumero}
- TÍTULO: ${temaTitulo}
- DESCRIPCIÓN: ${temaDescripcion}
- NIVEL: ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}
${seccionPreguntasExistentes}

ESTÁNDAR DE CALIDAD OBLIGATORIO:
✓ Lenguaje completamente formal, legal y profesional
✓ Contenido basado en normativa oficial y jurisprudencia consolidada
✓ Preguntas directas sin ambigüedades (formato de examen oficial)
✓ EXPLICACIONES EXHAUSTIVAS que incluyan:
  - Referencia exacta a artículos, apartados y párrafos de la normativa
  - Cita de leyes, decretos, órdenes ministeriales
  - Explicación del concepto jurídico clave
  - Por qué las otras opciones son incorrectas (indicar el error en cada una)
✓ Opciones creadas como "distractores reales": errores comunes, confusiones frecuentes, datos parcialmente correctos
✓ Distribución de dificultad: 40% fácil, 40% media, 20% difícil
✓ Variación en la posición de la respuesta correcta

NORMAS DE REDACCIÓN:
1. Las preguntas deben ser claras y directas (nunca negativas como "¿Cuál NO es...?")
2. Usa vocabulario exacto de la normativa
3. Incluye referencias precisas: "Según el artículo X de la Ley Y..." o "De conformidad con..."
4. Las opciones deben ser mutuamente excluyentes y plausibles
5. Una sola respuesta correcta, inequívocamente clara con la normativa

FORMATO JSON OBLIGATORIO (es CRÍTICO - DEBE SER JSON VÁLIDO):
⚠️ IMPORTANTE: El campo "opciones" DEBE ser un ARRAY de strings, NO un string.
⚠️ NUNCA escribas: "opciones": "A) ..., B) ..., C) ..., D) ..."
✓ SIEMPRE escribe: "opciones": ["A) ...", "B) ...", "C) ...", "D) ..."]

{
  "preguntas": [
    {
      "pregunta": "Texto de la pregunta con referencia a normativa cuando aplique",
      "opciones": [
        "A) Opción A - respuesta correcta con datos específicos",
        "B) Opción B - error común o confusión habitual",
        "C) Opción C - interpretación errónea de la norma",
        "D) Opción D - dato similar pero incorrecto"
      ],
      "respuestaCorrecta": 0,
      "explicacion": "[Artículo/Ley]: Cita o paráfrasis de la norma. La opción A es correcta porque... Las opciones B/C/D son incorrectas porque... [referencias complementarias]",
      "dificultad": "media"
    }
  ]
}

INSTRUCCIONES FINALES:
- Responde SOLO con el JSON válido (objeto con clave \"preguntas\")
- Verifica que sea JSON parseable
- El campo "opciones" DEBE SER UN ARRAY, nunca un string
- dificultad: "facil" (preguntas directas), "media" (requieren análisis), "dificil" (análisis profundo o combinación de conceptos)
- respuestaCorrecta: 0=A, 1=B, 2=C, 3=D
- NO incluyas explicaciones antes ni después del JSON
`;

  try {
    const maxTokens = Math.min(2600, Math.max(900, 450 * numPreguntas))
    const content = await groqChatJsonObject(prompt, maxTokens)
    if (!content) {
      return { preguntas: [] }
    }

    // Intentar parsear diferentes formatos de respuesta
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      // Intentar extraer JSON del contenido
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0])
        } catch (e2) {
          throw new Error('No se pudo parsear la respuesta de Groq como JSON.')
        }
      } else {
        throw new Error('La respuesta de Groq no contiene JSON válido.')
      }
    }

    // Normalizar formato: aceptar array o objeto único
    let preguntas: any[] = [];
    if (Array.isArray(parsed)) {
      preguntas = parsed;
    } else if (parsed.preguntas && Array.isArray(parsed.preguntas)) {
      preguntas = parsed.preguntas;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      preguntas = parsed.questions;
    } else if (parsed.pregunta || parsed.question || parsed.text) {
      preguntas = [parsed];
    } else {
      throw new Error('El formato de la respuesta de Groq no es válido. Esperado objeto con "preguntas" o array.')
    }

    return {
      preguntas: preguntas.map((p: any) => ({
        pregunta: p.pregunta || p.question || p.text,
        opciones: p.opciones || p.options || [],
        respuestaCorrecta:
          typeof p.respuestaCorrecta === 'number' ? p.respuestaCorrecta : (p.correctAnswer || p.correct || 0),
        explicacion: p.explicacion || p.explanation || '',
        dificultad: normalizarDificultad((p.dificultad || p.difficulty || 'media') as string)
      }))
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`Error generando preguntas para tema ${temaNumero}:`, error)
    
    // Registrar error en sistema de monitoreo
    await logError({
      errorType: 'EXTERNAL_SERVICE_ERROR',
      severity: 'medium',
      endpoint: 'POST /api/admin/generate-bulk-questions (tema específico)',
      message: `Theme question generation failed for tema ${temaNumero}: ${errorMessage}`,
      stack: errorStack,
      context: {
        service: 'Groq',
        operation: 'generarPreguntasParaTema',
        temaNumero,
        temaTitulo,
        categoria,
        numPreguntas
      },
      notifyAdmin: false // No notificar por cada tema fallido
    }).catch((logErr) => {
      console.error('Failed to log error:', logErr)
    })

    return {
      preguntas: [],
      error: errorMessage || 'Error desconocido llamando a Groq'
    }
  }
}
