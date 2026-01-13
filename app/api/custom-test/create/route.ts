import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { temaCodigoVariants } from '@/lib/tema-codigo'
import { rebalanceQuestionsABCD } from '@/lib/answer-alternation'

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

// POST - Crear test personalizado
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const isAdmin = session.user?.role === 'admin'

    const { generalTopics, specificTopics, questionCount, difficulty } = await req.json()

    if ((!generalTopics || generalTopics.length === 0) && (!specificTopics || specificTopics.length === 0)) {
      return NextResponse.json({ 
        error: 'Debes seleccionar al menos un tema' 
      }, { status: 400 })
    }

    if (!questionCount || questionCount < 5 || questionCount > 100) {
      return NextResponse.json({ 
        error: 'El número de preguntas debe estar entre 5 y 100' 
      }, { status: 400 })
    }

    const selectedTopics = [...(generalTopics || []), ...(specificTopics || [])]

    // Determinar distribución de preguntas
    const hasGeneral = generalTopics && generalTopics.length > 0
    const hasSpecific = specificTopics && specificTopics.length > 0
    
    let generalQuestionsCount = 0
    let specificQuestionsCount = 0

    if (hasGeneral && hasSpecific) {
      // Si hay temas de ambos tipos: 40% general, 60% específico
      generalQuestionsCount = Math.round(questionCount * 0.4)
      specificQuestionsCount = questionCount - generalQuestionsCount
    } else if (hasGeneral) {
      // Solo temas generales
      generalQuestionsCount = questionCount
    } else {
      // Solo temas específicos
      specificQuestionsCount = questionCount
    }

    const generalTopicCodes = uniqueStrings(
      (generalTopics || []).flatMap((t: string) => temaCodigoVariants(String(t)))
    ).map(t => t.toUpperCase())

    const specificTopicCodes = uniqueStrings(
      (specificTopics || []).flatMap((t: string) => temaCodigoVariants(String(t)))
    ).map(t => t.toUpperCase())

    // Obtener preguntas de temas generales
    const generalQuestions = hasGeneral ? await prisma.question.findMany({
      where: {
        temaCodigo: { in: generalTopicCodes },
        ...(difficulty && difficulty !== 'todas' ? { difficulty } : {})
      },
      include: {
        questionnaire: {
          select: {
            published: true
          }
        }
      }
    }) : []

    // Obtener preguntas de temas específicos
    const specificQuestions = hasSpecific ? await prisma.question.findMany({
      where: {
        temaCodigo: { in: specificTopicCodes },
        ...(difficulty && difficulty !== 'todas' ? { difficulty } : {})
      },
      include: {
        questionnaire: {
          select: {
            published: true
          }
        }
      }
    }) : []

    // Filtrar solo preguntas de cuestionarios publicados
    const availableGeneralQuestions = isAdmin
      ? generalQuestions
      : generalQuestions.filter((q: any) => q.questionnaire?.published)
    const availableSpecificQuestions = isAdmin
      ? specificQuestions
      : specificQuestions.filter((q: any) => q.questionnaire?.published)

    // Verificar que hay suficientes preguntas
    if (hasGeneral && availableGeneralQuestions.length < generalQuestionsCount) {
      return NextResponse.json({ 
        error: `Solo hay ${availableGeneralQuestions.length} preguntas disponibles en los temas generales seleccionados. Se necesitan ${generalQuestionsCount}.` 
      }, { status: 400 })
    }

    if (hasSpecific && availableSpecificQuestions.length < specificQuestionsCount) {
      return NextResponse.json({ 
        error: `Solo hay ${availableSpecificQuestions.length} preguntas disponibles en los temas específicos seleccionados. Se necesitan ${specificQuestionsCount}.` 
      }, { status: 400 })
    }

    // Seleccionar preguntas aleatorias de cada tipo
    const selectedGeneralQuestions = availableGeneralQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, generalQuestionsCount)
    
    const selectedSpecificQuestions = availableSpecificQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, specificQuestionsCount)

    const selectedQuestions = [...selectedGeneralQuestions, ...selectedSpecificQuestions]
      .sort(() => Math.random() - 0.5) // Mezclar todas las preguntas

    // Reequilibrar distribución de respuestas correctas (máx 2 iguales seguidas)
    const rebalanced = rebalanceQuestionsABCD(
      selectedQuestions.map((q: any) => ({
        id: q.id,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer
      })),
      2
    )
    const rebalanceById = new Map(rebalanced.map((x: any) => [x.id, x]))

    // Crear cuestionario temporal
    const distributionMsg = hasGeneral && hasSpecific 
      ? ` (${generalQuestionsCount} generales, ${specificQuestionsCount} específicas)`
      : ''
    const title = `Test Personalizado${distributionMsg} - ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: 'theory',
        published: true
      }
    })

    // Crear preguntas en el cuestionario (copiar las preguntas seleccionadas)
    await Promise.all(
      selectedQuestions.map((q: any, index: any) => {
        const rb = rebalanceById.get(q.id)
        const newOptions = rb?.options && Array.isArray(rb.options) ? rb.options : JSON.parse(q.options)
        const newCorrectAnswer = rb?.correctAnswer || q.correctAnswer
        return prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: q.text,
            options: JSON.stringify(newOptions),
            correctAnswer: newCorrectAnswer,
            explanation: q.explanation,
            temaCodigo: q.temaCodigo,
            temaNumero: q.temaNumero,
            temaParte: q.temaParte,
            temaTitulo: q.temaTitulo
          }
        })
      })
    )

    // Preparar preguntas para respuesta (para generador HTML)
    const questionsForResponse = selectedQuestions.map((q: any) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      tema: q.temaTitulo || `Tema ${q.temaNumero || 'N/A'}`
    }))

    return NextResponse.json({ 
      questionnaireId: questionnaire.id,
      questions: questionsForResponse,
      message: hasGeneral && hasSpecific 
        ? `Test creado con ${questionCount} preguntas (${generalQuestionsCount} generales 40%, ${specificQuestionsCount} específicas 60%)`
        : `Test creado con ${questionCount} preguntas`
    }, { status: 201 })
  } catch (error) {
    console.error('[Custom Test Create] Error:', error)
    return NextResponse.json({ 
      error: 'Error al crear el test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
