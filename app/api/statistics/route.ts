import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'
import type { Pool } from 'pg'

// Función mejorada para extraer fundamento legal con búsqueda en documentos
async function extractLegalArticle(
  pool: Pool,
  explanation: string, 
  correctAnswer: string, 
  questionText: string,
  temaCodigo?: string | null
): Promise<string> {
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
        
        // Si encontramos una referencia, intentar enriquecerla con contexto del documento
        const enrichedReference = await enrichLegalReference(pool, foundReference, temaCodigo)
        if (enrichedReference) {
          return enrichedReference
        }
        
        return foundReference
      }
    }
  }

  // 2. Si no encuentra referencia directa, buscar en documentos legales por contenido relacionado
  if (temaCodigo) {
    const relatedDocument = await findRelatedLegalDocument(pool, questionText, temaCodigo)
    if (relatedDocument) {
      return relatedDocument
    }
  }

  // 3. Búsqueda amplia en toda la base de documentos
  const broadSearch = await searchInAllDocuments(pool, questionText, correctAnswer)
  if (broadSearch) {
    return broadSearch
  }

  // Mensaje por defecto si no se encuentra
  return 'Fundamento legal no especificado. Consulta el temario o normativa aplicable según el contexto de la pregunta.'
}

// Función para enriquecer la referencia legal con contexto del documento
async function enrichLegalReference(pool: Pool, reference: string, temaCodigo?: string | null): Promise<string | null> {
  try {
    // Extraer número de artículo de la referencia
    const articleMatch = reference.match(/art[íi]culo\s+(\d+)/i) || reference.match(/art\.\s*(\d+)/i)
    const lawMatch = reference.match(/(ley|RDL?|real decreto\s+legislativo?)\s+\d+\/\d+/i)
    
    if (!articleMatch && !lawMatch) return null

    // Buscar en documentos que contengan esa referencia
    const searchTerms = []
    if (articleMatch) searchTerms.push(`artículo ${articleMatch[1]}`)
    if (lawMatch) searchTerms.push(lawMatch[0])

    const conditions = searchTerms.map((_, i) => `content ilike $${i + 1}`).join(' or ')
    const values = searchTerms.map(term => `%${term}%`)

    const documentsRes = await pool.query(
      `select reference, title, content from "LegalDocument" where active = true and (${conditions}) limit 1`,
      values
    )

    if (documentsRes.rows.length > 0) {
      const doc = documentsRes.rows[0] as any
      if (doc.reference) return `${reference} de ${doc.reference}`
    }

    return null
  } catch (error) {
    console.error('Error enriching legal reference:', error)
    return null
  }
}

// Función para buscar documento legal relacionado por tema
async function findRelatedLegalDocument(pool: Pool, questionText: string, temaCodigo: string): Promise<string | null> {
  try {
    // Extraer palabras clave de la pregunta (eliminar palabras comunes)
    const stopWords = ['el', 'la', 'de', 'en', 'y', 'a', 'los', 'las', 'del', 'al', 'por', 'con', 'para', 'que', 'es', 'se', 'un', 'una']
    const keywords = questionText
      .toLowerCase()
      .replace(/[¿?¡!.,;:]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5) // Top 5 keywords

    if (keywords.length === 0) return null

    // Buscar documentos que contengan esas palabras clave
    const conditions = keywords.map((_, i) => `content ilike $${i + 1}`).join(' or ')
    const values = keywords.map(k => `%${k}%`)

    const documentsRes = await pool.query(
      `select reference, title, content from "LegalDocument" where active = true and (${conditions}) limit 3`,
      values
    )

    if (documentsRes.rows.length > 0) {
      // Buscar el documento más relevante
      for (const doc of documentsRes.rows as any[]) {
        // Buscar artículos en el contenido del documento
        const articleMatches = doc.content.match(/art[íi]culo\s+\d+(\.\d+)?/gi)
        if (articleMatches && articleMatches.length > 0) {
          const firstArticle = articleMatches[0]
          if (doc.reference) {
            return `${firstArticle} de ${doc.reference} - ${doc.title}`
          }
          return `${firstArticle} - ${doc.title}`
        }
      }

      // Si no encontramos artículos específicos, devolver referencia del documento
      const doc = documentsRes.rows[0] as any
      if (doc.reference) {
        return `${doc.reference} - ${doc.title}`
      }
    }

    return null
  } catch (error) {
    console.error('Error finding related legal document:', error)
    return null
  }
}

// Función para búsqueda amplia en todos los documentos
async function searchInAllDocuments(pool: Pool, questionText: string, correctAnswer: string): Promise<string | null> {
  try {
    // Combinar pregunta y respuesta correcta para mejor contexto
    const searchText = `${questionText} ${correctAnswer}`.toLowerCase()
    
    // Extraer frases clave (más de 3 palabras juntas)
    const phrases = searchText.match(/\b\w+\s+\w+\s+\w+\s+\w+\b/g)
    if (!phrases || phrases.length === 0) return null

    // Buscar la frase más relevante en documentos
    const topPhrase = phrases[0]

    const documentsRes = await pool.query(
      `select reference, title, content from "LegalDocument" where active = true and content ilike $1 limit 1`,
      [`%${topPhrase}%`]
    )

    if (documentsRes.rows.length > 0) {
      const doc = documentsRes.rows[0] as any
      
      // Buscar el fragmento exacto en el contenido
      const contentLower = doc.content.toLowerCase()
      const phraseIndex = contentLower.indexOf(topPhrase.toLowerCase())
      
      if (phraseIndex !== -1) {
        // Extraer contexto alrededor de la frase (100 caracteres antes y después)
        const start = Math.max(0, phraseIndex - 100)
        const end = Math.min(doc.content.length, phraseIndex + topPhrase.length + 100)
        const context = doc.content.substring(start, end).trim()
        
        // Buscar artículo en ese contexto
        const articleMatch = context.match(/art[íi]culo\s+\d+(\.\d+)?/i)
        
        if (articleMatch && doc.reference) {
          return `${articleMatch[0]} de ${doc.reference}`
        }
        
        if (doc.reference) {
          return `Consultar ${doc.reference} - ${doc.title}`
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error searching in all documents:', error)
    return null
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
  let stage = 'start'
  try {
    stage = 'getSession'
    const session = await getServerSession(authOptions)
    stage = 'checkAuth'
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Obtener todas las respuestas del usuario con información de las preguntas.
    // Importante: en algunas BDs el campo se llama `selectedAnswer` (no `answer`), lo que rompe Prisma.
    stage = 'getPool'
    const pool = getPgPool()
    stage = 'detectAnswerColumn'
    const { answerColumn } = await getUserAnswerColumnInfo(pool)

    stage = 'queryUserAnswers'
    let userAnswerRows: any[] = []
    try {
      const uaRes = await pool.query(
        `
        select
          ua."questionId" as "questionId",
          ua."isCorrect" as "isCorrect",
          ua."createdAt" as "createdAt",
          ua."${answerColumn}" as "answer",
          q.text as "q_text",
          q."temaCodigo" as "q_temaCodigo",
          q."correctAnswer" as "q_correctAnswer",
          q.explanation as "q_explanation",
          qu.title as "qu_title",
          qu.type as "qu_type"
        from "UserAnswer" ua
        join "Question" q on q.id = ua."questionId"
        join "Questionnaire" qu on qu.id = q."questionnaireId"
        where ua."userId" = $1
        order by ua."createdAt" desc
        `,
        [userId]
      )
      userAnswerRows = uaRes.rows
    } catch (err) {
      // Production safety: if DB permissions/RLS/schema issues block this query,
      // return empty stats instead of taking down the UI.
      console.error('Error querying user answers for statistics:', err)
      userAnswerRows = []
    }

    stage = 'mapUserAnswers'
    const userAnswers = userAnswerRows.map((r: any) => ({
      questionId: r.questionId,
      isCorrect: r.isCorrect,
      createdAt: r.createdAt,
      answer: r.answer ?? '',
      question: {
        text: r.q_text,
        temaCodigo: r.q_temaCodigo ?? null,
        correctAnswer: r.q_correctAnswer,
        explanation: r.q_explanation,
        questionnaire: {
          title: r.qu_title,
          type: r.qu_type
        }
      }
    }))

    // Calcular estadísticas generales
    stage = 'calcGeneral'
    const totalQuestions = userAnswers.length
    const correctAnswers = userAnswers.filter((a: any) => a.isCorrect).length
    const incorrectAnswers = totalQuestions - correctAnswers
    const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

    // Agrupar errores por pregunta para detectar errores repetidos
    stage = 'groupErrors'
    const errorsByQuestion = new Map<string, {
      questionId: string
      questionText: string
      questionnaireTitle: string
      questionnaireType: string
      attempts: number
      errors: number
      correctAnswer: string
      explanation: string
      temaCodigo?: string | null
    }>()

    userAnswers.forEach((answer: any) => {
      if (!errorsByQuestion.has(answer.questionId)) {
        errorsByQuestion.set(answer.questionId, {
          questionId: answer.questionId,
          questionText: answer.question.text,
          questionnaireTitle: answer.question.questionnaire.title,
          questionnaireType: answer.question.questionnaire.type,
          attempts: 0,
          errors: 0,
          correctAnswer: answer.question.correctAnswer,
          explanation: answer.question.explanation,
          temaCodigo: (answer.question as any).temaCodigo ?? null
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
    stage = 'buildFailedQuestionsData'
    const failedQuestionsData = Array.from(errorsByQuestion.values())
      .filter(q => q.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 15) // Top 15 preguntas con más errores

    // Procesar cada pregunta fallada para obtener su fundamento legal (con búsqueda en BD)
    stage = 'extractLegalArticles'
    const failedQuestions = await Promise.all(
      failedQuestionsData.map(async (q) => {
        const legalArticle = await extractLegalArticle(
          pool,
          q.explanation || '', 
          q.correctAnswer || '',
          q.questionText || '',
          (q as any).temaCodigo ?? null
        )
        
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
    stage = 'groupThemes'
    const errorsByTheme = new Map<string, { errorCount: number; totalQuestions: number }>()
    
    userAnswers.forEach((answer: any) => {
      const themeName = answer.question.questionnaire.title
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
    stage = 'calcByType'
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

    userAnswers.forEach((answer: any) => {
      const type = answer.question.questionnaire.type as 'theory' | 'practical'
      statsByType[type].total++
      if (answer.isCorrect) {
        statsByType[type].correct++
      } else {
        statsByType[type].incorrect++
      }
    })

    stage = 'respond'
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
      recentErrors: userAnswers
        .filter((a: any) => !a.isCorrect)
        .slice(0, 20)
        .map((a: any) => ({
          questionId: a.questionId,
          questionText: a.question.text,
          questionnaireTitle: a.question.questionnaire.title,
          questionnaireType: a.question.questionnaire.type,
          userAnswer: a.answer,
          correctAnswer: a.question.correctAnswer,
          explanation: a.question.explanation,
          date: a.createdAt
        })),
      studyRecommendations: {
        failedQuestions,
        themesToReview
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', { stage, error })
    return NextResponse.json({ error: 'Failed to fetch statistics', stage }, { status: 500 })
  }
}
