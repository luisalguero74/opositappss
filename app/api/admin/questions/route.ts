import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeParseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v))
  const value = String(raw ?? '').trim()
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v))
  } catch {
    // fall through
  }

  return value
    .split(/\r?\n|\s*\|\s*|\s*;\s*/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questions = await prisma.question.findMany({
      include: {
        questionnaire: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: safeParseOptions(q.options),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      questionnaireName: q.questionnaire?.title || 'Sin cuestionario'
    }))

    return NextResponse.json(formattedQuestions)
  } catch (error) {
    console.error('[Admin Questions] Error:', error)
    return NextResponse.json({ error: 'Error al cargar preguntas' }, { status: 500 })
  }
}
