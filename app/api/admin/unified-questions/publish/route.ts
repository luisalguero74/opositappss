import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { questionIds, title } = await req.json()

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'Se requieren preguntas' }, { status: 400 })
    }

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Se requiere un título' }, { status: 400 })
    }

    // Crear el cuestionario
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: title.trim(),
        type: 'theory',
        published: true,
        questions: {
          connect: questionIds.map((id: string) => ({ id }))
        }
      },
      include: {
        questions: true
      }
    })

    return NextResponse.json({
      success: true,
      questionnaireId: questionnaire.id,
      title: questionnaire.title,
      questionCount: questionnaire.questions.length,
      message: `Cuestionario "${title}" creado exitosamente`
    }, { status: 201 })
  } catch (error) {
    console.error('Error publishing questionnaire:', error)
    return NextResponse.json(
      { error: 'Error al publicar el cuestionario' },
      { status: 500 }
    )
  }
}

