import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener todos los usuarios con sus estadísticas
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            userAnswers: true,
            threads: true,
            posts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Para cada usuario, obtener estadísticas detalladas
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Respuestas del usuario
        const answers = await prisma.userAnswer.findMany({
          where: { userId: user.id },
          select: {
            isCorrect: true,
            createdAt: true,
            questionnaireId: true
          }
        })

        // Cuestionarios únicos completados
        const uniqueQuestionnaires = new Set(answers.map(a => a.questionnaireId))

        // Calcular estadísticas
        const totalAnswers = answers.length
        const correctAnswers = answers.filter(a => a.isCorrect).length
        const incorrectAnswers = totalAnswers - correctAnswers
        const successRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0

        // Última actividad
        const lastActivity = answers.length > 0 
          ? answers.reduce((latest, answer) => 
              answer.createdAt > latest ? answer.createdAt : latest, 
              answers[0].createdAt
            )
          : user.createdAt

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          active: user.active,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastActivity,
          stats: {
            totalAnswers,
            correctAnswers,
            incorrectAnswers,
            successRate: Math.round(successRate * 100) / 100,
            questionnairesCompleted: uniqueQuestionnaires.size,
            forumThreads: user._count.threads,
            forumPosts: user._count.posts
          }
        }
      })
    )

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error('[Admin Users] Error fetching users:', error)
    return NextResponse.json({ error: 'Error al cargar usuarios' }, { status: 500 })
  }
}
