import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * API para obtener estadísticas avanzadas de cuestionarios y temas
 * Incluye análisis por tema, dificultad, tendencias, y comparativas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filterTema = searchParams.get('tema')
    const filterDifficulty = searchParams.get('difficulty')
    const daysBack = parseInt(searchParams.get('daysBack') || '30')

    // 1. Estadísticas generales del usuario
    const totalAttempts = await prisma.questionnaireAttempt.count({
      where: { userId: session.user.id }
    })

    const totalAnswers = await prisma.userAnswer.count({
      where: { userId: session.user.id }
    })

    const correctAnswers = await prisma.userAnswer.count({
      where: { userId: session.user.id, isCorrect: true }
    })

    // 2. Estadísticas por tema
    const themStats = await prisma.userAnswer.findMany({
      where: {
        userId: session.user.id,
        ...(filterTema && { question: { temaCodigo: filterTema } }),
        ...(filterDifficulty && { question: { difficulty: filterDifficulty } })
      },
      include: { question: true }
    })

    const themeMap = new Map<string, {
      tema: string
      total: number
      correct: number
      percentage: number
      difficulty: string
      questions: string[]
    }>()

    for (const answer of themStats) {
      const tema = answer.question.temaCodigo || 'Sin clasificar'
      if (!themeMap.has(tema)) {
        themeMap.set(tema, {
          tema,
          total: 0,
          correct: 0,
          percentage: 0,
          difficulty: answer.question.difficulty || 'media',
          questions: []
        })
      }
      const stat = themeMap.get(tema)!
      stat.total++
      if (answer.isCorrect) stat.correct++
      stat.percentage = Math.round((stat.correct / stat.total) * 100)
      if (!stat.questions.includes(answer.questionId)) {
        stat.questions.push(answer.questionId)
      }
    }

    const themeStatistics = Array.from(themeMap.values()).sort((a, b) => b.percentage - a.percentage)

    // 3. Preguntas fallidas (para review)
    const failedAnswers = await prisma.userAnswer.findMany({
      where: {
        userId: session.user.id,
        isCorrect: false,
        ...(filterTema && { question: { temaCodigo: filterTema } })
      },
      include: { question: true },
      take: 20,
      orderBy: { createdAt: 'desc' }
    })

    const failedQuestions = failedAnswers.map(a => ({
      questionId: a.questionId,
      text: a.question.text,
      userAnswer: a.answer,
      correctAnswer: a.question.correctAnswer,
      tema: a.question.temaCodigo,
      difficulty: a.question.difficulty,
      failureCount: failedAnswers.filter(f => f.questionId === a.questionId).length
    }))

    // 4. Racha de estudio (streak)
    const streak = await prisma.studyStreak.findUnique({
      where: { userId: session.user.id }
    }).catch(() => null)

    // 5. Logros desbloqueados
    const achievements = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' }
    })

    // 6. Sesiones de estudio recientes
    const recentSessions = await prisma.studySession.findMany({
      where: {
        userId: session.user.id,
        startedAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 10
    })

    // 7. Intentos por día (para gráfico)
    const dailyAttempts = await prisma.questionnaireAttempt.findMany({
      where: {
        userId: session.user.id,
        completedAt: {
          gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
        }
      },
      select: { completedAt: true, score: true }
    })

    const dailyMap = new Map<string, { attempts: number; avgScore: number; scores: number[] }>()
    for (const attempt of dailyAttempts) {
      const date = new Date(attempt.completedAt).toISOString().split('T')[0]
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { attempts: 0, avgScore: 0, scores: [] })
      }
      const daily = dailyMap.get(date)!
      daily.attempts++
      daily.scores.push(attempt.score)
      daily.avgScore = Math.round(daily.scores.reduce((a, b) => a + b) / daily.scores.length)
    }

    const chartData = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      avgScore: data.avgScore
    })).sort((a, b) => a.date.localeCompare(b.date))

    // 8. Resumen general
    const averageScore = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0
    
    return NextResponse.json({
      success: true,
      summary: {
        totalAttempts,
        totalAnswers,
        correctAnswers,
        incorrectAnswers: totalAnswers - correctAnswers,
        averageScore,
        totalStudyDays: streak?.totalStudyDays || 0
      },
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
        totalDays: streak?.totalStudyDays || 0
      },
      themeStatistics,
      failedQuestions: failedQuestions.slice(0, 10),
      achievements: achievements.map(a => ({
        code: a.achievement.code,
        name: a.achievement.name,
        icon: a.achievement.icon,
        unlockedAt: a.unlockedAt
      })),
      recentSessions: recentSessions.map(s => ({
        date: s.startedAt,
        duration: s.duration,
        questionsAnswered: s.questionsAnswered,
        correctAnswers: s.correctAnswers,
        topics: s.topics ? JSON.parse(s.topics) : []
      })),
      chartData,
      filters: {
        tema: filterTema,
        difficulty: filterDifficulty,
        daysBack
      }
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas avanzadas:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
