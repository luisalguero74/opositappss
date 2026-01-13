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
        const enrichedReference = await enrichLegalReference(foundReference, temaCodigo)
        if (enrichedReference) {
          return enrichedReference
        }
        
        return foundReference
      }
    }
  }

  // 2. Si no encuentra referencia directa, buscar en documentos legales por contenido relacionado
  if (temaCodigo) {
    const relatedDocument = await findRelatedLegalDocument(questionText, temaCodigo)
    if (relatedDocument) {
      return relatedDocument
    }
  }

  // 3. Búsqueda amplia en toda la base de documentos
  const broadSearch = await searchInAllDocuments(questionText, correctAnswer)
  if (broadSearch) {
    return broadSearch
  }

  // Mensaje por defecto si no se encuentra
  return 'Fundamento legal no especificado. Consulta el temario o normativa aplicable según el contexto de la pregunta.'
}

// Función para enriquecer la referencia legal con contexto del documento
async function enrichLegalReference(reference: string, temaCodigo?: string | null): Promise<string | null> {
  try {
    // Extraer número de artículo de la referencia
    const articleMatch = reference.match(/art[íi]culo\s+(\d+)/i) || reference.match(/art\.\s*(\d+)/i)
    const lawMatch = reference.match(/(ley|RDL?|real decreto\s+legislativo?)\s+\d+\/\d+/i)
    
    if (!articleMatch && !lawMatch) return null

    // Buscar en documentos que contengan esa referencia
    const searchTerms = []
    if (articleMatch) searchTerms.push(`artículo ${articleMatch[1]}`)
    if (lawMatch) searchTerms.push(lawMatch[0])

    const documents = await prisma.legalDocument.findMany({
      where: {
        active: true,
        OR: searchTerms.map(term => ({
          content: {
            contains: term,
            mode: 'insensitive' as const
          }
        }))
      },
      select: {
        reference: true,
        title: true,
        content: true
      },
      take: 1
    })

    if (documents.length > 0) {
      const doc = documents[0]
      if (doc.reference) {
        return `${reference} de ${doc.reference}`
      }
    }

    return null
  } catch (error) {
    console.error('Error enriching legal reference:', error)
    return null
  }
}

// Función para buscar documento legal relacionado por tema
async function findRelatedLegalDocument(questionText: string, temaCodigo: string): Promise<string | null> {
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
    const documents = await prisma.legalDocument.findMany({
      where: {
        active: true,
        OR: keywords.map(keyword => ({
          content: {
            contains: keyword,
            mode: 'insensitive' as const
          }
        }))
      },
      select: {
        reference: true,
        title: true,
        content: true,
        type: true
      },
      take: 3
    })

    if (documents.length > 0) {
      // Buscar el documento más relevante
      for (const doc of documents) {
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
      const doc = documents[0]
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
async function searchInAllDocuments(questionText: string, correctAnswer: string): Promise<string | null> {
  try {
    // Combinar pregunta y respuesta correcta para mejor contexto
    const searchText = `${questionText} ${correctAnswer}`.toLowerCase()
    
    // Extraer frases clave (más de 3 palabras juntas)
    const phrases = searchText.match(/\b\w+\s+\w+\s+\w+\s+\w+\b/g)
    if (!phrases || phrases.length === 0) return null

    // Buscar la frase más relevante en documentos
    const topPhrase = phrases[0]

    const documents = await prisma.legalDocument.findMany({
      where: {
        active: true,
        content: {
          contains: topPhrase,
          mode: 'insensitive' as const
        }
      },
      select: {
        reference: true,
        title: true,
        content: true
      },
      take: 1
    })

    if (documents.length > 0) {
      const doc = documents[0]
      
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
    let userAnswers: any[] = []
    try {
      userAnswers = await prisma.userAnswer.findMany({
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
    } catch (e: any) {
      console.error('[Statistics] Error fetching answers from Prisma:', e.message)
      // If Prisma fails, return empty statistics rather than error
      userAnswers = []
    }

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
    const failedQuestions = failedQuestionsData.map(async (q) => {
      // Extraer artículos legales de la explicación de forma simple
      let legalArticle = 'No especificado'
      if (q.explanation) {
        const matches = q.explanation.match(/art[íi]culo\s+\d+(\.\d+)?/gi)
        if (matches && matches[0]) {
          legalArticle = matches[0]
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
    
    // Wait for all promises to resolve
    const resolvedFailedQuestions = await Promise.all(failedQuestions)

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
        failedQuestions: resolvedFailedQuestions,
        themesToReview
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
