import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeCorrectAnswerToUpperLetter } from '@/lib/answer-normalization'

function normalizeTemaParte(value: unknown): string | null {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.startsWith('GEN')) {
    return 'GENERAL'
  }
  if (normalized.startsWith('ESP')) {
    return 'ESPECÍFICO'
  }

  return raw
}

// Endpoint para importación masiva de preguntas
// Solo accesible con clave secreta
export async function POST(req: NextRequest) {
  try {
    // Verificar clave secreta
    const authHeader = req.headers.get('authorization')
    const secret = process.env.IMPORT_SECRET || 'opositapp-import-2026'
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { questionnaires } = body

    if (!Array.isArray(questionnaires)) {
      return NextResponse.json({ error: 'Se requiere un array de cuestionarios' }, { status: 400 })
    }

    let imported = 0
    let failed = 0
    const results = []

    for (const q of questionnaires) {
      try {
        const questionnaire = await prisma.questionnaire.create({
          data: {
            title: q.title,
            type: q.type || 'theory',
            published: true,
            questions: {
              create: q.questions.map((question: any, idx: number) => {
                const opts = Array.isArray(question.options) ? question.options.map((o: any) => String(o ?? '').trim()) : []
                if (opts.length !== 4) {
                  throw new Error(`Pregunta ${idx + 1}: opciones inválidas (se requieren 4)`)
                }

                const normalizedCorrect = normalizeCorrectAnswerToUpperLetter(question.correctAnswer, opts)
                if (!normalizedCorrect) {
                  throw new Error(`Pregunta ${idx + 1}: correctAnswer inválida; debe ser A/B/C/D, índice 0-3/1-4, o texto exacto de una opción`)
                }

                return {
                  text: String(question.text ?? '').trim(),
                  options: JSON.stringify(opts),
                  correctAnswer: normalizedCorrect,
                explanation: question.explanation || '',
                temaCodigo: question.temaCodigo || null,
                temaNumero: question.temaNumero || null,
                temaParte: normalizeTemaParte(question.temaParte),
                temaTitulo: question.temaTitulo || null,
                difficulty: question.difficulty || 'media',
                legalBasis: question.legalBasis || null
                }
              })
            }
          }
        })

        imported++
        results.push({ title: q.title, success: true, id: questionnaire.id })
      } catch (error: any) {
        failed++
        results.push({ title: q.title, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: questionnaires.length,
      results
    })
  } catch (error: any) {
    console.error('[Import] Error:', error)
    return NextResponse.json({ 
      error: 'Error en importación',
      details: error.message 
    }, { status: 500 })
  }
}
