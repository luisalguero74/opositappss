import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Inicializar con valores por defecto
    let analytics: any = {
      general: {
        totalAttempts: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        averageScore: 0,
        totalIncorrect: 0
      },
      streak: {
        current: 0,
        longest: 0,
        totalDays: 0
      },
      byTema: [],
      failedQuestions: [],
      recentAttempts: [],
      chartData: []
    }

    try {
      // 1. Estadísticas generales
      const [totalAttempts, totalQuestions, totalCorrect, recentAttempts] = await Promise.all([
        prisma.questionnaireAttempt.count({
          where: { userId: user.id }
        }).catch(() => 0),
        prisma.userAnswer.count({
          where: { userId: user.id }
        }).catch(() => 0),
        prisma.userAnswer.count({
          where: { userId: user.id, isCorrect: true }
        }).catch(() => 0),
        prisma.questionnaireAttempt.findMany({
          where: { userId: user.id },
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: {
            questionnaire: {
              select: { title: true, type: true }
            }
          }
        }).catch(() => [])
      ])

      const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

      analytics.general = {
        totalAttempts,
        totalQuestions,
        totalCorrect,
        averageScore,
        totalIncorrect: totalQuestions - totalCorrect
      }

      analytics.recentAttempts = recentAttempts.map(a => ({
        id: a.id,
        title: a.questionnaire.title,
        type: a.questionnaire.type,
        score: a.score,
        correctAnswers: a.correctAnswers,
        totalQuestions: a.totalQuestions,
        completedAt: a.completedAt
      }))

      // 2. Estadísticas por tema
      try {
        const answers = await prisma.userAnswer.findMany({
          where: { 
            userId: user.id, 
            question: { temaCodigo: { not: null } } 
          },
          include: { question: true }
        })

        const temaStats = new Map<string, {
          codigo: string
          numero: number
          titulo: string
          total: number
          correct: number
        }>()

        for (const answer of answers) {
          const tema = answer.question.temaCodigo
          if (!tema) continue

          if (!temaStats.has(tema)) {
            temaStats.set(tema, {
              codigo: tema,
              numero: answer.question.temaNumero || 0,
              titulo: answer.question.temaTitulo || '',
              total: 0,
              correct: 0
            })
          }

          const stats = temaStats.get(tema)!
          stats.total++
          if (answer.isCorrect) stats.correct++
        }

        analytics.byTema = Array.from(temaStats.values())
          .map(t => ({
            ...t,
            percentage: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
          }))
          .sort((a, b) => a.numero - b.numero)
      } catch (err) {
        console.error('[Analytics] Error getting tema stats:', err)
        analytics.byTema = []
      }

      // 3. Preguntas falladas
      try {
        const failedQuestions = await prisma.userAnswer.findMany({
          where: {
            userId: user.id,
            isCorrect: false
          },
          include: {
            question: {
              select: {
                id: true,
                text: true,
                temaCodigo: true,
                temaNumero: true,
                temaTitulo: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        })

        const failedMap = new Map<string, number>()
        for (const f of failedQuestions) {
          failedMap.set(f.questionId, (failedMap.get(f.questionId) || 0) + 1)
        }

        analytics.failedQuestions = Array.from(failedMap.entries())
          .map(([id, count]) => {
            const q = failedQuestions.find(f => f.questionId === id)
            return { questionId: id, count, question: q?.question }
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      } catch (err) {
        console.error('[Analytics] Error getting failed questions:', err)
        analytics.failedQuestions = []
      }

      // 4. Racha de estudio
      try {
        let streak = await prisma.studyStreak.findUnique({
          where: { userId: user.id }
        })

        if (!streak) {
          streak = await prisma.studyStreak.create({
            data: { userId: user.id }
          })
        }

        analytics.streak = {
          current: streak.currentStreak || 0,
          longest: streak.longestStreak || 0,
          totalDays: streak.totalStudyDays || 0
        }
      } catch (err) {
        console.error('[Analytics] Error getting streak:', err)
        analytics.streak = { current: 0, longest: 0, totalDays: 0 }
      }

      // 5. Progreso en los últimos 30 días
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const progressByDay = new Map<string, { total: number, correct: number }>()
        const recentAnswers = await prisma.userAnswer.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: thirtyDaysAgo }
          },
          select: { createdAt: true, isCorrect: true }
        })
        
        for (const p of recentAnswers) {
          const day = p.createdAt.toISOString().split('T')[0]
          if (!progressByDay.has(day)) {
            progressByDay.set(day, { total: 0, correct: 0 })
          }
          const stats = progressByDay.get(day)!
          stats.total++
          if (p.isCorrect) stats.correct++
        }

        analytics.chartData = Array.from(progressByDay.entries())
          .map(([date, stats]) => ({
            date,
            total: stats.total,
            correct: stats.correct,
            percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Si no hay datos en los últimos 30 días, generar días vacíos para mostrar la gráfica
        if (analytics.chartData.length === 0) {
          for (let i = 29; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            
            analytics.chartData.push({
              date: dateStr,
              total: 0,
              correct: 0,
              percentage: 0
            })
          }
        }
      } catch (err) {
        console.error('[Analytics] Error getting chart data:', err)
        analytics.chartData = []
      }
    } catch (innerErr) {
      console.error('[Analytics] Inner error:', innerErr)
      // Devolver datos por defecto aunque haya error
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('[Analytics] Fatal error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener estadísticas',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
