import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'week'

    // Calcular fechas según rango
    const now = new Date()
    let startDate = new Date()
    
    switch (range) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    // USUARIOS
    const totalUsers = await prisma.user.count()
    
    const activeToday = await prisma.userAnswer.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    const activeWeek = await prisma.userAnswer.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const activeMonth = await prisma.userAnswer.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const newThisWeek = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })

    // PREGUNTAS
    const totalQuestions = await prisma.question.count()
    
    const questionsByDifficulty = await prisma.question.groupBy({
      by: ['difficulty'],
      _count: true
    })

    const difficultyMap = {
      easy: questionsByDifficulty.find(d => d.difficulty === 'facil')?._count || 0,
      medium: questionsByDifficulty.find(d => d.difficulty === 'media')?._count || 0,
      hard: questionsByDifficulty.find(d => d.difficulty === 'dificil')?._count || 0
    }

    // Preguntas más difíciles (mayor tasa de error)
    const questionsWithStats = await prisma.question.findMany({
      take: 5,
      include: {
        userAnswers: {
          select: {
            isCorrect: true
          }
        }
      },
      orderBy: {
        userAnswers: {
          _count: 'desc'
        }
      }
    })

    const mostDifficult = questionsWithStats
      .map(q => {
        const total = q.userAnswers.length
        const incorrect = q.userAnswers.filter(a => !a.isCorrect).length
        return {
          id: q.id,
          text: q.text,
          errorRate: total > 0 ? incorrect / total : 0
        }
      })
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)

    // Preguntas menos practicadas
    const leastPracticed = questionsWithStats
      .map(q => ({
        id: q.id,
        text: q.text,
        attempts: q.userAnswers.length
      }))
      .sort((a, b) => a.attempts - b.attempts)
      .slice(0, 5)

    // ENGAGEMENT
    const attempts = await prisma.questionnaireAttempt.findMany({
      where: {
        completedAt: {
          gte: startDate
        }
      },
      select: {
        timeSpent: true,
        completedAt: true,
        totalQuestions: true,
        correctAnswers: true
      }
    })

    const avgSessionTime = attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / attempts.length / 60)
      : 0

    const totalSessions = attempts.length

    const questionsAnsweredToday = await prisma.userAnswer.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    })

    const completionRate = attempts.length > 0
      ? Math.round(
          (attempts.reduce((sum, a) => sum + (a.correctAnswers / a.totalQuestions), 0) / attempts.length) * 100
        )
      : 0

    // MONETIZACIÓN (mock data por ahora - integrar con APIs reales después)
    const monetization = {
      kofiPatrons: 0, // TODO: Integrar con Ko-fi API
      patreonPatrons: 0, // TODO: Integrar con Patreon API
      adsImpressions: 0, // TODO: Integrar con AdSense API
      adsClicks: 0,
      estimatedRevenue: 0
    }

    const stats = {
      users: {
        total: totalUsers,
        activeToday: activeToday.length,
        activeWeek: activeWeek.length,
        activeMonth: activeMonth.length,
        newThisWeek
      },
      questions: {
        total: totalQuestions,
        byDifficulty: difficultyMap,
        mostDifficult,
        leastPracticed
      },
      engagement: {
        avgSessionTime,
        totalSessions,
        questionsAnsweredToday,
        completionRate
      },
      monetization
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[Admin Analytics Error]:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
