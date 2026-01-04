import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener historial detallado de un usuario
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Información del usuario
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Historial de respuestas con detalles
    const answers = await prisma.userAnswer.findMany({
      where: { userId: id },
      include: {
        question: {
          select: {
            text: true,
            correctAnswer: true
          }
        },
        questionnaire: {
          select: {
            title: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Threads y posts del foro
    const threads = await prisma.forumThread.findMany({
      where: { userId: id },
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: {
          select: { posts: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    const posts = await prisma.forumPost.findMany({
      where: { userId: id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        thread: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    // Agrupar respuestas por cuestionario
    const questionnaireStats = answers.reduce((acc, answer) => {
      const qId = answer.questionnaireId
      if (!acc[qId]) {
        acc[qId] = {
          questionnaireId: qId,
          title: answer.questionnaire.title,
          type: answer.questionnaire.type,
          totalAnswers: 0,
          correctAnswers: 0,
          lastAttempt: answer.createdAt
        }
      }
      acc[qId].totalAnswers++
      if (answer.isCorrect) acc[qId].correctAnswers++
      if (answer.createdAt > acc[qId].lastAttempt) {
        acc[qId].lastAttempt = answer.createdAt
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      user,
      history: {
        answers: answers.map(a => ({
          id: a.id,
          question: a.question.text,
          answer: a.answer,
          correctAnswer: a.question.correctAnswer,
          isCorrect: a.isCorrect,
          questionnaire: a.questionnaire.title,
          questionnaireType: a.questionnaire.type,
          createdAt: a.createdAt
        })),
        questionnaires: Object.values(questionnaireStats),
        forumThreads: threads,
        forumPosts: posts
      }
    })
  } catch (error) {
    console.error('[Admin User Detail] Error:', error)
    return NextResponse.json({ error: 'Error al cargar historial' }, { status: 500 })
  }
}

// Actualizar rol o estado del usuario
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const { role, active } = await req.json()

    const updateData: any = {}
    
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      }
      updateData.role = role
    }
    
    if (active !== undefined) {
      updateData.active = active
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData
    })

    if (role !== undefined) {
      console.log(`[Admin] Rol de ${user.email} cambiado a ${role}`)
    }
    if (active !== undefined) {
      console.log(`[Admin] Usuario ${user.email} ${active ? 'activado' : 'desactivado'}`)
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('[Admin User Update] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

// Eliminar usuario
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // No permitir que el admin se elimine a sí mismo
    if (id === session.user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id }
    })

    console.log(`[Admin] Usuario ${id} eliminado`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin User Delete] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
