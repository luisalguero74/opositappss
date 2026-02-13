import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchRelevantContext } from '@/lib/rag-system'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

function normalizeDifficultyToDb(difficulty: string | null | undefined): string | null {
  if (!difficulty) return null
  const d = String(difficulty).toLowerCase()
  if (d === 'easy') return 'facil'
  if (d === 'medium') return 'media'
  if (d === 'hard') return 'dificil'
  return difficulty
}

function safeJsonParseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

async function callGroqForQa(params: {
  questionText: string
  options: string[]
  correctAnswer: string
  explanation: string | null
  context: string
  topic: string | null
}): Promise<{ text: string; options: string[]; correctAnswer: string; explanation: string }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY no está configurada')
  }

  const prompt = `Eres un revisor experto de preguntas tipo test para oposiciones (España).\n\nOBJETIVO\n- Revisar y mejorar una pregunta existente usando EXCLUSIVAMENTE el CONTEXTO proporcionado.\n- Garantizar que la respuesta correcta es coherente con el contexto, y que la explicación cita (o parafrasea fielmente) el contexto.\n\nCONTEXTO (fuente única permitida)\n${params.context}\n\nPREGUNTA ACTUAL\n- Texto: ${params.questionText}\n- Opciones: ${JSON.stringify(params.options)}\n- Respuesta correcta: ${params.correctAnswer}\n- Explicación: ${params.explanation ?? ''}\n- Tema/Topic: ${params.topic ?? ''}\n\nREGLAS\n1) No inventes artículos, datos, plazos o cifras que no estén en el contexto.\n2) Mantén exactamente 4 opciones.\n3) correctAnswer debe ser una de: A, B, C, D.\n4) La explicación debe justificar por qué la opción correcta lo es y por qué las incorrectas no lo son, apoyándose en el contexto.\n5) Si el contexto es insuficiente para asegurar la respuesta, reescribe la pregunta para que sea verificable con el contexto.\n\nDEVUELVE SOLO JSON VÁLIDO con esta forma:\n{\n  \"text\": \"...\",\n  \"options\": [\"...\", \"...\", \"...\", \"...\"],\n  \"correctAnswer\": \"A\",\n  \"explanation\": \"...\"\n}`

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Eres un revisor experto. Respondes SOLO con JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${text}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No se recibió contenido de Groq')

  const parsed = JSON.parse(content)
  const options = safeJsonParseArray(parsed.options)
  const correctAnswer = String(parsed.correctAnswer || '').toUpperCase()

  if (!parsed.text || options.length !== 4 || !['A', 'B', 'C', 'D'].includes(correctAnswer) || !parsed.explanation) {
    throw new Error('Respuesta de QA inválida (estructura incorrecta)')
  }

  return {
    text: String(parsed.text),
    options,
    correctAnswer,
    explanation: String(parsed.explanation)
  }
}

async function buildContextForQuestion(params: { documentId: string; sectionId: string | null; query: string }) {
  if (params.sectionId) {
    const section = await prisma.documentSection.findUnique({
      where: { id: params.sectionId },
      select: { title: true, content: true, embedding: true, documentId: true }
    })

    if (section?.content) {
      return `SECCIÓN: ${section.title ?? 'Sin título'}\n\n${section.content.substring(0, 8000)}`
    }
  }

  // Fallback: buscar secciones más relevantes del documento por embeddings/keywords
  const sections = await prisma.documentSection.findMany({
    where: { documentId: params.documentId },
    select: { id: true, title: true, content: true, embedding: true },
    take: 50
  })

  if (sections.length === 0) return ''

  const relevant = await searchRelevantContext(
    params.query,
    sections.map(s => ({
      id: s.id,
      title: s.title ?? 'Sección',
      content: s.content || '',
      embedding: s.embedding
    })),
    3
  )

  const chunks = relevant.map((r, idx) => {
    const title = r.documentTitle
    const content = r.content.substring(0, 4000)
    return `FUENTE ${idx + 1}: ${title}\n${content}`
  })

  return chunks.join('\n\n---\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const questionIds: string[] = Array.isArray(body.questionIds) ? body.questionIds : []
    const batchSize: number = typeof body.batchSize === 'number' ? body.batchSize : 5

    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere array questionIds' }, { status: 400 })
    }

    const resultados = {
      procesadas: 0,
      exitosas: 0,
      fallidas: 0,
      errores: [] as string[]
    }

    for (let i = 0; i < questionIds.length; i += batchSize) {
      const batch = questionIds.slice(i, i + batchSize)

      for (const id of batch) {
        resultados.procesadas++
        try {
          const q = await prisma.generatedQuestion.findUnique({
            where: { id },
            select: {
              id: true,
              text: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              difficulty: true,
              topic: true,
              documentId: true,
              sectionId: true
            }
          })

          if (!q) {
            resultados.fallidas++
            resultados.errores.push(`Pregunta IA ${id} no encontrada`)
            continue
          }

          const options = safeJsonParseArray(q.options)
          const context = await buildContextForQuestion({
            documentId: q.documentId,
            sectionId: q.sectionId,
            query: q.text
          })

          if (!context) {
            resultados.fallidas++
            resultados.errores.push(`Sin contexto suficiente para ${id}`)
            continue
          }

          const improved = await callGroqForQa({
            questionText: q.text,
            options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            context,
            topic: q.topic
          })

          await prisma.generatedQuestion.update({
            where: { id },
            data: {
              text: improved.text,
              options: JSON.stringify(improved.options),
              correctAnswer: improved.correctAnswer,
              explanation: improved.explanation,
              difficulty: normalizeDifficultyToDb(q.difficulty) ?? q.difficulty,
              reviewed: true,
              reviewedAt: new Date(),
              reviewedBy: session.user.id
            }
          })

          resultados.exitosas++
        } catch (error: any) {
          resultados.fallidas++
          resultados.errores.push(`Error en ${id}: ${error?.message || 'Unknown error'}`)
        }

        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }

    return NextResponse.json({ success: true, ...resultados })
  } catch (error: any) {
    console.error('[AI Questions QA] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al aplicar QA a preguntas IA' },
      { status: 500 }
    )
  }
}
