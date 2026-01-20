import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rebalanceQuestionsABCD } from '@/lib/answer-alternation'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { title, questionIds } = await req.json()

    if (!title || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ 
        error: 'Título y preguntas son requeridos' 
      }, { status: 400 })
    }

    // Verificar que las preguntas existen
    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { in: questionIds }
      },
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
        temaNumero: true,
        temaParte: true,
        temaTitulo: true,
        difficulty: true
      }
    })

    if (existingQuestions.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron preguntas válidas' 
      }, { status: 404 })
    }

    // Crear nuevo cuestionario
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: 'theory',
        published: false, // No publicar automáticamente
        statement: `Cuestionario personalizado con ${existingQuestions.length} preguntas seleccionadas`
      }
    })

    // Reequilibrar distribución de respuestas correctas (máx 2 iguales seguidas)
    // Pasamos options tal cual (string o array) y dejamos que la utilidad haga el parseo seguro
    const rebalanced = rebalanceQuestionsABCD(
      existingQuestions.map(q => ({
        id: q.id,
        options: q.options,
        correctAnswer: q.correctAnswer
      })),
      2
    )
    const rebalanceById = new Map(
      rebalanced.map((x: any) => [x.id, x])
    )

    // Copiar las preguntas al nuevo cuestionario aplicando el rebalanceo
    const newQuestions = await Promise.all(
      existingQuestions.map(q => {
        const rb = rebalanceById.get(q.id)

        let newOptions: any = rb?.options

        if (!Array.isArray(newOptions)) {
          if (typeof q.options === 'string') {
            try {
              const parsed = JSON.parse(q.options as any)
              newOptions = Array.isArray(parsed) ? parsed : []
            } catch {
              newOptions = []
            }
          } else if (Array.isArray(q.options)) {
            newOptions = q.options
          } else {
            newOptions = []
          }
        }

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
            temaTitulo: q.temaTitulo,
            difficulty: q.difficulty
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        questionCount: newQuestions.length
      }
    })

  } catch (error) {
    console.error('[Create Questionnaire from Selection] Error:', error)
    return NextResponse.json({ 
      error: 'Error al crear cuestionario' 
    }, { status: 500 })
  }
}
