import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeCorrectAnswerToUpperLetter } from '@/lib/answer-normalization'

function normalizeTemaParte(value: unknown): string | null {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  // Normalizar acentos y mayúsculas para comparar
  const normalized = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos

  // Solo tocamos valores que claramente indican GENERAL / ESPECIFICO
  if (normalized.startsWith('GEN')) {
    return 'GENERAL'
  }
  if (normalized.startsWith('ESP')) {
    return 'ESPECÍFICO'
  }

  // Para otros valores (por ejemplo, etiquetas internas como "LGSS"), devolvemos el valor original tal cual
  return raw
}

// POST - Publicar un test como cuestionario
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { title, type, questions, temaParte } = body

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ 
        error: 'Título y preguntas son requeridos' 
      }, { status: 400 })
    }

    const normalizedGlobalTemaParte = normalizeTemaParte(temaParte)

    // Crear cuestionario
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: type || 'theory',
        published: true,
        questions: {
          create: questions.map((q: any, index: number) => {
            const perQuestionTemaParte = normalizeTemaParte(q.temaParte)

            const opts: string[] = Array.isArray(q.options)
              ? q.options.map((o: any) => String(o ?? '').trim()).filter(Boolean)
              : []

            const normalizedCorrect = normalizeCorrectAnswerToUpperLetter(q.correctAnswer, opts)
            if (!normalizedCorrect) {
              const preview = String(q?.text || '').trim().slice(0, 80)
              throw new Error(`correctAnswer inválida para pregunta: "${preview}"`)
            }

            return {
              text: q.text,
              options: JSON.stringify(opts),
              correctAnswer: normalizedCorrect,
              // En el modelo Prisma, explanation es NOT NULL → usar string vacía si no viene
              explanation: typeof q.explanation === 'string' ? q.explanation : '',
              temaCodigo: q.temaCodigo || null,
              temaParte: perQuestionTemaParte ?? normalizedGlobalTemaParte
            }
          })
        }
      },
      include: {
        questions: true
      }
    })

    return NextResponse.json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        questionCount: questionnaire.questions.length
      }
    })
  } catch (error) {
    console.error('[Publish Questionnaire] Error:', error)
    return NextResponse.json({ 
      error: 'Error al publicar cuestionario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
