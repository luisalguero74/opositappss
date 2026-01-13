import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPgPool } from '@/lib/pg'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const pool = getPgPool()

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
      const [totalAttemptsRes, totalQuestionsRes, totalCorrectRes, recentAttemptsRes] = await Promise.all([
        pool.query('select count(*)::int as n from "QuestionnaireAttempt" where "userId" = $1', [userId]).catch(() => ({ rows: [{ n: 0 }] } as any)),
        pool.query('select count(*)::int as n from "UserAnswer" where "userId" = $1', [userId]).catch(() => ({ rows: [{ n: 0 }] } as any)),
        pool.query('select count(*)::int as n from "UserAnswer" where "userId" = $1 and "isCorrect" = true', [userId]).catch(() => ({ rows: [{ n: 0 }] } as any)),
        pool.query(
          `
          select a.id, a.score, a."correctAnswers", a."totalQuestions", a."completedAt", q.title, q.type
          from "QuestionnaireAttempt" a
          join "Questionnaire" q on q.id = a."questionnaireId"
          where a."userId" = $1
          order by a."completedAt" desc
          limit 10
          `,
          [userId]
        ).catch(() => ({ rows: [] } as any))
      ])

      const totalAttempts = Number(totalAttemptsRes.rows?.[0]?.n ?? 0)
      const totalQuestions = Number(totalQuestionsRes.rows?.[0]?.n ?? 0)
      const totalCorrect = Number(totalCorrectRes.rows?.[0]?.n ?? 0)
      const recentAttempts = recentAttemptsRes.rows ?? []

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
        title: a.title,
        type: a.type,
        score: a.score,
        correctAnswers: a.correctAnswers,
        totalQuestions: a.totalQuestions,
        completedAt: a.completedAt
      }))

      // 2. Estadísticas por tema
      try {
        const temaRes = await pool.query(
          `
          select
            q."temaCodigo" as codigo,
            coalesce(q."temaNumero", 0) as numero,
            coalesce(q."temaTitulo", '') as titulo,
            count(*)::int as total,
            sum(case when ua."isCorrect" then 1 else 0 end)::int as correct
          from "UserAnswer" ua
          join "Question" q on q.id = ua."questionId"
          where ua."userId" = $1 and q."temaCodigo" is not null
          group by q."temaCodigo", q."temaNumero", q."temaTitulo"
          order by coalesce(q."temaNumero", 0) asc
          `,
          [userId]
        )

        analytics.byTema = (temaRes.rows ?? []).map((t: any) => ({
          codigo: String(t.codigo),
          numero: Number(t.numero ?? 0),
          titulo: String(t.titulo ?? ''),
          total: Number(t.total ?? 0),
          correct: Number(t.correct ?? 0),
          percentage: Number(t.total ?? 0) > 0 ? Math.round((Number(t.correct ?? 0) / Number(t.total ?? 0)) * 100) : 0
        }))
      } catch (err) {
        console.error('[Analytics] Error getting tema stats:', err)
        analytics.byTema = []
      }

      // 3. Preguntas falladas
      try {
        const failedRes = await pool.query(
          `
          select
            ua."questionId" as "questionId",
            count(*)::int as count,
            max(ua."createdAt") as "lastFailed",
            q.id as id,
            q.text as text,
            q."temaCodigo" as "temaCodigo",
            q."temaNumero" as "temaNumero",
            q."temaTitulo" as "temaTitulo"
          from "UserAnswer" ua
          join "Question" q on q.id = ua."questionId"
          where ua."userId" = $1 and ua."isCorrect" = false
          group by ua."questionId", q.id, q.text, q."temaCodigo", q."temaNumero", q."temaTitulo"
          order by count(*) desc
          limit 10
          `,
          [userId]
        )

        analytics.failedQuestions = (failedRes.rows ?? []).map((r: any) => ({
          questionId: String(r.questionId),
          count: Number(r.count ?? 0),
          question: {
            id: String(r.id),
            text: r.text,
            temaCodigo: r.temaCodigo,
            temaNumero: r.temaNumero,
            temaTitulo: r.temaTitulo
          }
        }))
      } catch (err) {
        console.error('[Analytics] Error getting failed questions:', err)
        analytics.failedQuestions = []
      }

      // 4. Racha de estudio
      try {
        let streak = await prisma.studyStreak.findUnique({
          where: { userId }
        })

        if (!streak) {
          streak = await prisma.studyStreak.create({
            data: { userId }
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

        const progressRes = await pool.query(
          `
          select
            date_trunc('day', ua."createdAt")::date as day,
            count(*)::int as total,
            sum(case when ua."isCorrect" then 1 else 0 end)::int as correct
          from "UserAnswer" ua
          where ua."userId" = $1 and ua."createdAt" >= $2
          group by day
          order by day asc
          `,
          [userId, thirtyDaysAgo]
        )

        const progressByDay = new Map<string, { total: number, correct: number }>()
        for (const r of progressRes.rows ?? []) {
          const dateStr = new Date(r.day).toISOString().split('T')[0]
          progressByDay.set(dateStr, { total: Number(r.total ?? 0), correct: Number(r.correct ?? 0) })
        }

        analytics.chartData = Array.from(progressByDay.entries()).map(([date, stats]) => ({
          date,
          total: stats.total,
          correct: stats.correct,
          percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
        }))

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
