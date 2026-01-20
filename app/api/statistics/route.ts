import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'

// Función mejorada para extraer fundamento legal
function extractLegalArticle(
  explanation: string, 
  correctAnswer: string, 
  questionText: string,
  temaCodigo?: string | null
): string {
  try {
    // Patrones comunes de artículos legales mejorados
    const patterns = [
      /art[íi]culo\s+\d+(\.\d+)?(\s+(?:bis|ter|quater|quinquies))?[^\n.]*/gi,
      /art\.\s*\d+(\.\d+)?(\s+(?:bis|ter|quater))?[^\n.]*/gi,
      /según\s+(?:el\s+)?art[íi]culo\s+\d+[^\n.]*/gi,
      /conforme\s+(?:al\s+)?art[íi]culo\s+\d+[^\n.]*/gi,
      /de\s+acuerdo\s+con\s+(?:el\s+)?art[íi]culo\s+\d+[^\n.]*/gi,
      /ley\s+\d+\/\d+[^\n.]*/gi,
      /real\s+decreto\s+legislativo\s+\d+\/\d+[^\n.]*/gi,
      /real\s+decreto\s+\d+\/\d+[^\n.]*/gi,
      /RDL\s+\d+\/\d+[^\n.]*/gi,
      /RD\s+\d+\/\d+[^\n.]*/gi,
      /disposición\s+adicional\s+\w+[^\n.]*/gi,
      /disposición\s+transitoria\s+\w+[^\n.]*/gi,
      /disposición\s+final\s+\w+[^\n.]*/gi,
    ]

    // 1. Buscar en la explicación y respuesta correcta primero (más rápido)
    const textsToSearch = [explanation, correctAnswer, questionText].filter(Boolean)
    
    for (const text of textsToSearch) {
      for (const pattern of patterns) {
        const matches = text.match(pattern)
        if (matches && matches[0]) {
          const foundReference = matches[0].trim()
          return foundReference
        }
      }
    }

    // Mensaje por defecto si no se encuentra
    return 'Fundamento legal no especificado. Consulta el temario o normativa aplicable según el contexto de la pregunta.'
  } catch (error) {
    console.warn('[Statistics] Error in extractLegalArticle:', error)
    return 'Fundamento legal no especificado.'
  }
}

// Función para generar recomendación personalizada según el tema
function generateRecommendation(errorCount: number, totalQuestions: number, themeName: string): string {
  const errorRate = (errorCount / totalQuestions) * 100

  if (errorRate >= 70) {
    return `⚠️ URGENTE: Este tema requiere estudio completo desde cero. Has fallado ${errorCount} de ${totalQuestions} preguntas (${Math.round(errorRate)}%). Dedica varias sesiones de estudio exclusivas a este tema, lee la normativa base y realiza esquemas.`
  } else if (errorRate >= 50) {
    return `🔴 ALTA PRIORIDAD: Necesitas reforzar este tema. Revisa los artículos legales principales, realiza resúmenes y vuelve a hacer los tests después de estudiar la teoría.`
  } else if (errorRate >= 30) {
    return `🟡 ATENCIÓN NECESARIA: Tienes conceptos que consolidar. Repasa las partes específicas donde has fallado, consulta la normativa y practica con más ejercicios.`
  } else {
    return `🟢 Buen rendimiento general, pero repasa los puntos específicos donde has fallado para alcanzar la excelencia.`
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const userId = session.user.id
    const pool = getPgPool()

    // 1) Estadísticas generales
    const generalRes = await pool.query(
      `
      select
        count(*)::int as total,
        sum(case when "isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer"
      where "userId" = $1
      `,
      [userId]
    )

    const totalQuestions = Number(generalRes.rows?.[0]?.total ?? 0)
    const correctAnswers = Number(generalRes.rows?.[0]?.correct ?? 0)
    const incorrectAnswers = totalQuestions - correctAnswers
    const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    if (totalQuestions === 0) {
      // Sin respuestas todavía: devolver estructura vacía
      return NextResponse.json({
        general: {
          totalQuestions: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          successRate: 0
        },
        byType: {
          theory: {
            total: 0,
            correct: 0,
            incorrect: 0,
            successRate: 0
          },
          practical: {
            total: 0,
            correct: 0,
            incorrect: 0,
            successRate: 0
          }
        },
        repeatedErrors: [],
        recentErrors: [],
        studyRecommendations: {
          failedQuestions: [],
          themesToReview: []
        }
      })
    }

    // 2) Estadísticas por tipo de cuestionario (teoría / práctico)
    const typeRes = await pool.query(
      `
      select
        qq.type as type,
        count(*)::int as total,
        sum(case when ua."isCorrect" then 1 else 0 end)::int as correct
      from "UserAnswer" ua
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      where ua."userId" = $1
      group by qq.type
      `,
      [userId]
    )

    const statsByType = {
      theory: { total: 0, correct: 0, incorrect: 0 },
      practical: { total: 0, correct: 0, incorrect: 0 }
    }

    for (const row of typeRes.rows ?? []) {
      const t = (row.type === 'practical' ? 'practical' : 'theory') as 'theory' | 'practical'
      const total = Number(row.total ?? 0)
      const correct = Number(row.correct ?? 0)
      statsByType[t].total = total
      statsByType[t].correct = correct
      statsByType[t].incorrect = total - correct
    }

    // 3) Agregado por pregunta para errores repetidos y recomendaciones
    const aggRes = await pool.query(
      `
      select
        ua."questionId"        as "questionId",
        count(*)::int           as "attempts",
        sum(case when ua."isCorrect" = false then 1 else 0 end)::int as "errors",
        q.text                  as "questionText",
        q."correctAnswer"      as "correctAnswer",
        q.explanation           as "explanation",
        q."temaCodigo"         as "temaCodigo",
        q."temaNumero"         as "temaNumero",
        q."temaTitulo"         as "temaTitulo",
        qq.title                as "questionnaireTitle",
        qq.type                 as "questionnaireType"
      from "UserAnswer" ua
      join "Question" q on q.id = ua."questionId"
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      where ua."userId" = $1
      group by ua."questionId", q.text, q."correctAnswer", q.explanation,
               q."temaCodigo", q."temaNumero", q."temaTitulo", qq.title, qq.type
      `,
      [userId]
    )

    const perQuestion = aggRes.rows ?? []

    // 3a) Errores repetidos
    const repeatedErrors = perQuestion
      .filter((r: any) => Number(r.errors ?? 0) > 0)
      .sort((a: any, b: any) => Number(b.errors ?? 0) - Number(a.errors ?? 0))
      .map((r: any) => ({
        questionId: String(r.questionId),
        questionText: r.questionText || 'Pregunta sin texto',
        questionnaireTitle: r.questionnaireTitle || 'Sin cuestionario',
        questionnaireType: r.questionnaireType || 'unknown',
        attempts: Number(r.attempts ?? 0),
        errors: Number(r.errors ?? 0),
        correctAnswer: r.correctAnswer || '',
        explanation: r.explanation || ''
      })) as any[]

    // 3b) Preguntas falladas para recomendaciones (top 15)
    const failedQuestionsData = perQuestion
      .filter((r: any) => Number(r.errors ?? 0) > 0)
      .sort((a: any, b: any) => Number(b.errors ?? 0) - Number(a.errors ?? 0))
      .slice(0, 15)

    const failedQuestions = failedQuestionsData.map((r: any) => {
      let legalArticle = 'No especificado'

      try {
        const extracted = extractLegalArticle(
          r.explanation || '',
          r.correctAnswer || '',
          r.questionText || '',
          r.temaCodigo
        )
        if (extracted) {
          legalArticle = extracted
        }
      } catch (error) {
        console.warn(`[Statistics] Error extracting legal article for question ${r.questionId}:`, error)
        if (r.explanation) {
          const matches = String(r.explanation).match(/art[íi]culo\s+\d+(\.\d+)?/i)
          if (matches) {
            legalArticle = matches[0]
          }
        }
      }

      return {
        questionText: r.questionText || 'Pregunta sin texto',
        questionnaireTitle: r.questionnaireTitle || 'Sin cuestionario',
        correctAnswer: r.correctAnswer || '',
        legalArticle,
        errors: Number(r.errors ?? 0)
      }
    })

    // 3c) Temas a revisar (agrupado por título de cuestionario)
    const errorsByTheme = new Map<string, { errorCount: number; totalQuestions: number }>()

    for (const r of perQuestion) {
      const attempts = Number((r as any).attempts ?? 0)
      const errors = Number((r as any).errors ?? 0)
      const themeName = (r as any).questionnaireTitle || 'Sin tema'

      if (!errorsByTheme.has(themeName)) {
        errorsByTheme.set(themeName, { errorCount: 0, totalQuestions: 0 })
      }
      const stats = errorsByTheme.get(themeName)!
      stats.totalQuestions += attempts
      stats.errorCount += errors
    }

    const themesToReview = Array.from(errorsByTheme.entries())
      .map(([themeName, stats]) => {
        const errorRate = stats.totalQuestions > 0
          ? Math.round((stats.errorCount / stats.totalQuestions) * 100)
          : 0
        return {
          themeName,
          errorCount: stats.errorCount,
          totalQuestions: stats.totalQuestions,
          errorRate,
          recommendation: generateRecommendation(stats.errorCount, stats.totalQuestions || 1, themeName)
        }
      })
      .filter(theme => theme.errorRate > 30 && theme.errorCount >= 3)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)

    // 4) Fallos recientes (últimas 20 respuestas incorrectas)
    const { answerColumn } = await getUserAnswerColumnInfo(pool)

    const recentSql = `
      select
        ua."questionId"        as "questionId",
        ua."createdAt"        as "createdAt",
        ua."${answerColumn}"  as "userAnswer",
        q.text                  as "questionText",
        q."correctAnswer"      as "correctAnswer",
        q.explanation           as "explanation",
        qq.title                as "questionnaireTitle",
        qq.type                 as "questionnaireType"
      from "UserAnswer" ua
      join "Question" q on q.id = ua."questionId"
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      where ua."userId" = $1 and ua."isCorrect" = false
      order by ua."createdAt" desc
      limit 20
    `

    const recentRes = await pool.query(recentSql, [userId])

    const recentErrors = (recentRes.rows ?? []).map((r: any) => ({
      questionId: String(r.questionId),
      questionText: r.questionText || 'Pregunta sin texto',
      questionnaireTitle: r.questionnaireTitle || 'Sin cuestionario',
      questionnaireType: r.questionnaireType || 'unknown',
      userAnswer: String(r.userAnswer ?? ''),
      correctAnswer: r.correctAnswer || '',
      explanation: r.explanation || '',
      date: r.createdAt
    }))

    return NextResponse.json({
      general: {
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        successRate: Math.round(successRate * 100) / 100
      },
      byType: {
        theory: {
          ...statsByType.theory,
          successRate: statsByType.theory.total > 0
            ? Math.round((statsByType.theory.correct / statsByType.theory.total) * 10000) / 100
            : 0
        },
        practical: {
          ...statsByType.practical,
          successRate: statsByType.practical.total > 0
            ? Math.round((statsByType.practical.correct / statsByType.practical.total) * 10000) / 100
            : 0
        }
      },
      repeatedErrors,
      recentErrors,
      studyRecommendations: {
        failedQuestions,
        themesToReview
      }
    })
  } catch (error: any) {
    console.error('Error fetching statistics:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    })
    return NextResponse.json(
      {
        error: 'Error al obtener estadísticas',
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    )
  }
}
