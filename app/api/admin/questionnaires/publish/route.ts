import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Publicar un test como cuestionario
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { title, type, questions } = await req.json()

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ 
        error: 'Título y preguntas son requeridos' 
      }, { status: 400 })
    }

    // Crear cuestionario
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: type || 'theory',
        published: true,
        questions: {
          create: questions.map((q, index) => ({
            text: q.text,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || null,
            temaCodigo: q.temaCodigo || null,
            order: index + 1
          }))
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
      error: 'Error al publicar cuestionario' 
    }, { status: 500 })
  }
}
