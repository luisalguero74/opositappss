import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const pool = getPgPool()

    // Si se solicita un usuario específico
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, createdAt: true }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const { answerColumn } = await getUserAnswerColumnInfo(pool)

      const answersRes = await pool.query(
        `
        select
          ua."questionId"        as "questionId",
          ua."isCorrect"         as "isCorrect",
          ua."createdAt"         as "createdAt",
          ua."${answerColumn}"  as "userAnswer",
          q.text                  as "questionText",
          q."correctAnswer"     as "correctAnswer",
          q.explanation           as "explanation",
          qq.title                as "questionnaireTitle",
          qq.type                 as "questionnaireType"
        from "UserAnswer" ua
        join "Question" q on q.id = ua."questionId"
        join "Questionnaire" qq on qq.id = ua."questionnaireId"
        where ua."userId" = $1
        order by ua."createdAt" desc
        `,
        [userId]
      )

      const userAnswers = answersRes.rows ?? []
      const totalQuestions = userAnswers.length
      const correctAnswers = userAnswers.filter(a => a.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      // Errores por pregunta
      const errorsByQuestion = new Map<string, any>()
      for (const answer of userAnswers) {
        const qId = String(answer.questionId)
        if (!errorsByQuestion.has(qId)) {
          errorsByQuestion.set(qId, {
            questionId: qId,
            questionText: answer.questionText || 'Pregunta sin texto',
            questionnaireTitle: answer.questionnaireTitle || 'Sin cuestionario',
            questionnaireType: answer.questionnaireType || 'unknown',
            attempts: 0,
            errors: 0,
            correctAnswer: answer.correctAnswer || '',
            explanation: answer.explanation || ''
          })
        }
        const questionStats = errorsByQuestion.get(qId)!
        questionStats.attempts++
        if (!answer.isCorrect) questionStats.errors++
      }

      const repeatedErrors = Array.from(errorsByQuestion.values())
        .filter((q: any) => q.errors > 0)
        .sort((a: any, b: any) => b.errors - a.errors)

      const statsByType = {
        theory: { total: 0, correct: 0, incorrect: 0 },
        practical: { total: 0, correct: 0, incorrect: 0 }
      }

      for (const answer of userAnswers) {
        const type = (answer.questionnaireType === 'practical' ? 'practical' : 'theory') as 'theory' | 'practical'
        statsByType[type].total++
        if (answer.isCorrect) {
          statsByType[type].correct++
        } else {
          statsByType[type].incorrect++
        }
      }

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          memberSince: user.createdAt
        },
        general: {
          totalQuestions,
          correctAnswers,
          incorrectAnswers,
          successRate: Math.round(successRate * 100) / 100
        },
        byType: {
          theory: {
            ...statsByType.theory,
            successRate:
              statsByType.theory.total > 0
                ? Math.round((statsByType.theory.correct / statsByType.theory.total) * 10000) / 100
                : 0
          },
          practical: {
            ...statsByType.practical,
            successRate:
              statsByType.practical.total > 0
                ? Math.round((statsByType.practical.correct / statsByType.practical.total) * 10000) / 100
                : 0
          }
        },
        repeatedErrors,
        recentErrors: userAnswers
          .filter(a => !a.isCorrect)
          .slice(0, 20)
          .map(a => ({
            questionId: String(a.questionId),
            questionText: a.questionText || 'Pregunta sin texto',
            questionnaireTitle: a.questionnaireTitle || 'Sin cuestionario',
            questionnaireType: a.questionnaireType || 'unknown',
            userAnswer: String(a.userAnswer ?? ''),
            correctAnswer: a.correctAnswer || '',
            explanation: a.explanation || '',
            date: a.createdAt
          }))
      })
    }

    // Estadísticas globales de todos los usuarios
    const allUsers = await prisma.user.findMany({
      where: { role: 'user' },
      select: { id: true, email: true, createdAt: true }
    })

    // Global general
    const globalRes = await pool.query(
      `
      select
        count(*)::int as total,
        sum(case when "isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer"
      `
    )

    const globalTotal = Number(globalRes.rows?.[0]?.total ?? 0)
    const globalCorrect = Number(globalRes.rows?.[0]?.correct ?? 0)
    const globalIncorrect = globalTotal - globalCorrect
    const globalSuccessRate = globalTotal > 0 ? (globalCorrect / globalTotal) * 100 : 0

    // Por tipo global
    const typeRes = await pool.query(
      `
      select
        qq.type as type,
        count(*)::int as total,
        sum(case when ua."isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer" ua
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      group by qq.type
      `
    )

    const globalByType = {
      theory: { total: 0, correct: 0 },
      practical: { total: 0, correct: 0 }
    }

    for (const row of typeRes.rows ?? []) {
      const t = (row.type === 'practical' ? 'practical' : 'theory') as 'theory' | 'practical'
      globalByType[t].total = Number(row.total ?? 0)
      globalByType[t].correct = Number(row.correct ?? 0)
    }

    // Estadísticas agregadas por usuario
    const perUserGeneralRes = await pool.query(
      `
      select
        "userId",
        count(*)::int as total,
        sum(case when "isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer"
      group by "userId"
      `
    )

    const perUserTypeRes = await pool.query(
      `
      select
        ua."userId" as "userId",
        qq.type        as type,
        count(*)::int  as total,
        sum(case when ua."isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer" ua
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      group by ua."userId", qq.type
      `
    )

    const generalByUser = new Map<string, { total: number; correct: number }>()
    for (const row of perUserGeneralRes.rows ?? []) {
      const uid = String(row.userId)
      generalByUser.set(uid, {
        total: Number(row.total ?? 0),
        correct: Number(row.correct ?? 0)
      })
    }

    const typeByUser = new Map<
      string,
      {
        theory: { total: number; correct: number }
        practical: { total: number; correct: number }
      }
    >()

    for (const row of perUserTypeRes.rows ?? []) {
      const uid = String(row.userId)
      let entry = typeByUser.get(uid)
      if (!entry) {
        entry = {
          theory: { total: 0, correct: 0 },
          practical: { total: 0, correct: 0 }
        }
        typeByUser.set(uid, entry)
      }

      const t = (row.type === 'practical' ? 'practical' : 'theory') as 'theory' | 'practical'
      entry[t].total = Number(row.total ?? 0)
      entry[t].correct = Number(row.correct ?? 0)
    }

    // Construir estadísticas por usuario solo para usuarios existentes
    const userStats = allUsers.map(user => {
      const general = generalByUser.get(user.id) || { total: 0, correct: 0 }
      const types =
        typeByUser.get(user.id) || {
          theory: { total: 0, correct: 0 },
          practical: { total: 0, correct: 0 }
        }

      const total = general.total
      const correct = general.correct
      const successRate = total > 0 ? (correct / total) * 100 : 0

      return {
        userId: user.id,
        email: user.email,
        memberSince: user.createdAt,
        totalQuestions: total,
        correctAnswers: correct,
        incorrectAnswers: total - correct,
        successRate: Math.round(successRate * 100) / 100,
        theoryTotal: types.theory.total,
        theoryCorrect: types.theory.correct,
        practicalTotal: types.practical.total,
        practicalCorrect: types.practical.correct
      }
    })

    // Ordenar por más preguntas realizadas
    userStats.sort((a, b) => b.totalQuestions - a.totalQuestions)

    return NextResponse.json({
      global: {
        totalUsers: allUsers.length,
        totalQuestions: globalTotal,
        correctAnswers: globalCorrect,
        incorrectAnswers: globalIncorrect,
        successRate: Math.round(globalSuccessRate * 100) / 100,
        byType: {
          theory: {
            total: globalByType.theory.total,
            correct: globalByType.theory.correct,
            successRate:
              globalByType.theory.total > 0
                ? Math.round((globalByType.theory.correct / globalByType.theory.total) * 10000) / 100
                : 0
          },
          practical: {
            total: globalByType.practical.total,
            correct: globalByType.practical.correct,
            successRate:
              globalByType.practical.total > 0
                ? Math.round((globalByType.practical.correct / globalByType.practical.total) * 10000) / 100
                : 0
          }
        }
      },
      users: userStats
    })
  } catch (error) {
    console.error('Error fetching admin statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
