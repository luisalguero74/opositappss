import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Función mejorada para extraer fundamento legal con búsqueda en documentos
async function extractLegalArticle(
  explanation: string, 
  correctAnswer: string, 
  questionText: string,
  temaCodigo?: string | null
): Promise<string> {
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Obtener todas las respuestas del usuario de forma simple y rápida
    const userAnswers = await prisma.userAnswer.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        questionId: true,
        questionnaireId: true,
        answer: true,
        isCorrect: true,
        createdAt: true,
        question: {
          select: {
            id: true,
            text: true,
            correctAnswer: true,
            explanation: true,
            questionnaire: {
              select: {
                id: true,
                title: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas generales - filtrando respuestas sin pregunta
    const validAnswers = userAnswers.filter((a: any) => a.question) as any[]
    const totalQuestions = validAnswers.length
    const correctAnswers = validAnswers.filter((a: any) => a.isCorrect).length
    const incorrectAnswers = totalQuestions - correctAnswers
    const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    console.log(`[Statistics] User: ${user.email} | Total answers: ${userAnswers.length} | Valid: ${validAnswers.length}`)

    if (totalQuestions === 0) {
      // Si no hay respuestas válidas, retornar estructura vacía
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

    // Agrupar errores por pregunta para detectar errores repetidos
    const errorsByQuestion = new Map<string, {
      questionId: string
      questionText: string
      questionnaireTitle: string
      questionnaireType: string
      attempts: number
      errors: number
      correctAnswer: string
      explanation: string
    }>()

    validAnswers.forEach((answer: any) => {
      if (!errorsByQuestion.has(answer.questionId)) {
        errorsByQuestion.set(answer.questionId, {
          questionId: answer.questionId,
          questionText: answer.question.text || 'Pregunta sin texto',
          questionnaireTitle: answer.question.questionnaire?.title || 'Sin cuestionario',
          questionnaireType: answer.question.questionnaire?.type || 'unknown',
          attempts: 0,
          errors: 0,
          correctAnswer: answer.question.correctAnswer || '',
          explanation: answer.question.explanation || ''
        })
      }

      const questionStats = errorsByQuestion.get(answer.questionId)!
      questionStats.attempts++
      if (!answer.isCorrect) {
        questionStats.errors++
      }
    })

    // Convertir a array y ordenar por número de errores
    const repeatedErrors = Array.from(errorsByQuestion.values())
      .filter(q => q.errors > 0)
      .sort((a, b) => b.errors - a.errors)

    // NUEVAS RECOMENDACIONES DE ESTUDIO
    // 1. Extraer preguntas falladas con artículos legales (búsqueda mejorada)
    const failedQuestionsData = Array.from(errorsByQuestion.values())
      .filter(q => q.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 15) // Top 15 preguntas con más errores

    // Procesar cada pregunta fallada para obtener su fundamento legal (con búsqueda en BD)
    const failedQuestions = await Promise.all(
      failedQuestionsData.map(async (q) => {
        let legalArticle = 'No especificado'
        
        try {
          // Buscar la pregunta completa para obtener temaCodigo
          const fullQuestion = await prisma.question.findUnique({
            where: { id: q.questionId },
            select: { temaCodigo: true }
          })
          
          const extractedArticle = await extractLegalArticle(
            q.explanation || '', 
            q.correctAnswer || '',
            q.questionText || '',
            fullQuestion?.temaCodigo
          )
          
          if (extractedArticle) {
            legalArticle = extractedArticle
          }
        } catch (error) {
          console.warn(`[Statistics] Error extracting legal article for question ${q.questionId}:`, error)
          // Fall back to simple extraction from explanation
          if (q.explanation) {
            const matches = q.explanation.match(/art[íi]culo\s+\d+(\.\d+)?/i)
            if (matches) {
              legalArticle = matches[0]
            }
          }
        }
        
        return {
          questionText: q.questionText,
          questionnaireTitle: q.questionnaireTitle,
          correctAnswer: q.correctAnswer,
          legalArticle: legalArticle,
          errors: q.errors
        }
      })
    )

    // 2. Agrupar errores por tema y generar recomendaciones
    const errorsByTheme = new Map<string, { errorCount: number; totalQuestions: number }>()
    
    validAnswers.forEach((answer: any) => {
      if (!answer.question.questionnaire) {
        return
      }
      
      const themeName = answer.question.questionnaire.title || 'Sin tema'
      if (!errorsByTheme.has(themeName)) {
        errorsByTheme.set(themeName, { errorCount: 0, totalQuestions: 0 })
      }
      const themeStats = errorsByTheme.get(themeName)!
      themeStats.totalQuestions++
      if (!answer.isCorrect) {
        themeStats.errorCount++
      }
    })

    // Filtrar temas con tasa de error > 30% y al menos 3 errores
    const themesToReview = Array.from(errorsByTheme.entries())
      .map(([themeName, stats]) => ({
        themeName,
        errorCount: stats.errorCount,
        totalQuestions: stats.totalQuestions,
        errorRate: Math.round((stats.errorCount / stats.totalQuestions) * 100),
        recommendation: generateRecommendation(stats.errorCount, stats.totalQuestions, themeName)
      }))
      .filter(theme => theme.errorRate > 30 && theme.errorCount >= 3)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5) // Top 5 temas con peor rendimiento

    // Estadísticas por tipo de cuestionario
    const statsByType = {
      theory: {
        total: 0,
        correct: 0,
        incorrect: 0
      },
      practical: {
        total: 0,
        correct: 0,
        incorrect: 0
      }
    }

    validAnswers.forEach((answer: any) => {
      if (!answer.question.questionnaire) {
        return
      }
      
      const type = (answer.question.questionnaire.type || 'theory') as 'theory' | 'practical'
      statsByType[type].total++
      if (answer.isCorrect) {
        statsByType[type].correct++
      } else {
        statsByType[type].incorrect++
      }
    })

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
      recentErrors: validAnswers
        .filter((a: any) => !a.isCorrect && a.question && a.question.questionnaire)
        .slice(0, 20)
        .map((a: any) => ({
          questionId: a.questionId,
          questionText: a.question.text || 'Pregunta sin texto',
          questionnaireTitle: a.question.questionnaire?.title || 'Sin cuestionario',
          questionnaireType: a.question.questionnaire?.type || 'unknown',
          userAnswer: a.answer || '',
          correctAnswer: a.question.correctAnswer || '',
          explanation: a.question.explanation || '',
          date: a.createdAt
        })),
      studyRecommendations: {
        failedQuestions,
        themesToReview
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
