import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Exportar historial completo de un usuario
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

    // Todas las respuestas del usuario
    const answers = await prisma.userAnswer.findMany({
      where: { userId: id },
      include: {
        question: {
          select: {
            text: true,
            options: true,
            correctAnswer: true,
            explanation: true
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

    // Threads del foro
    const threads = await prisma.forumThread.findMany({
      where: { userId: id },
      include: {
        posts: {
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Posts del foro
    const posts = await prisma.forumPost.findMany({
      where: { userId: id },
      include: {
        thread: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calcular estadísticas globales
    const totalAnswers = answers.length
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const successRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0

    // Agrupar por cuestionario
    const questionnaireStats = answers.reduce((acc, answer) => {
      const qId = answer.questionnaireId
      if (!acc[qId]) {
        acc[qId] = {
          questionnaireId: qId,
          title: answer.questionnaire.title,
          type: answer.questionnaire.type,
          totalAnswers: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          firstAttempt: answer.createdAt,
          lastAttempt: answer.createdAt
        }
      }
      acc[qId].totalAnswers++
      if (answer.isCorrect) {
        acc[qId].correctAnswers++
      } else {
        acc[qId].incorrectAnswers++
      }
      if (answer.createdAt < acc[qId].firstAttempt) {
        acc[qId].firstAttempt = answer.createdAt
      }
      if (answer.createdAt > acc[qId].lastAttempt) {
        acc[qId].lastAttempt = answer.createdAt
      }
      return acc
    }, {} as Record<string, any>)

    // Crear objeto de exportación completo
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        role: user.role,
        active: user.active,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      statistics: {
        totalAnswers,
        correctAnswers,
        incorrectAnswers: totalAnswers - correctAnswers,
        successRate: Math.round(successRate * 100) / 100,
        questionnairesCompleted: Object.keys(questionnaireStats).length,
        forumThreadsCreated: threads.length,
        forumPostsCreated: posts.length
      },
      questionnaires: Object.values(questionnaireStats).map((q: any) => ({
        ...q,
        successRate: q.totalAnswers > 0 ? Math.round((q.correctAnswers / q.totalAnswers) * 100 * 100) / 100 : 0
      })),
      answers: answers.map(a => ({
        questionText: a.question.text,
        options: a.question.options,
        userAnswer: a.answer,
        correctAnswer: a.question.correctAnswer,
        isCorrect: a.isCorrect,
        explanation: a.question.explanation,
        questionnaire: a.questionnaire.title,
        questionnaireType: a.questionnaire.type,
        answeredAt: a.createdAt
      })),
      forumThreads: threads.map(t => ({
        title: t.title,
        createdAt: t.createdAt,
        postsCount: t.posts.length,
        posts: t.posts
      })),
      forumPosts: posts.map(p => ({
        content: p.content,
        threadTitle: p.thread.title,
        createdAt: p.createdAt
      }))
    }

    console.log(`[Admin] Historial exportado para ${user.email}`)

    // Devolver como JSON descargable
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="historial_${user.email.replace('@', '_')}_${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error('[Admin Export] Error:', error)
    return NextResponse.json({ error: 'Error al exportar historial' }, { status: 500 })
  }
}
