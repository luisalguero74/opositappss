import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// POST - Enviar respuestas del examen oficial y calcular puntuación
// ============================================================================
// Sistema de puntuación:
// - Correcta: +1 punto
// - Incorrecta: -0.25 puntos
// - En blanco: 0 puntos
// Parte 1 (70 preguntas): transformar a escala sobre 50
// Parte 2 (15 preguntas): transformar a escala sobre 50
// Total: suma de ambas partes (sobre 100)
// ============================================================================

export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { examId, testAnswers, practicalAnswers, timeSpent } = body

    // Validaciones
    if (!examId) {
      return NextResponse.json({ error: 'examId es obligatorio' }, { status: 400 })
    }

    if (!Array.isArray(testAnswers) || testAnswers.length !== 70) {
      return NextResponse.json({ 
        error: 'testAnswers debe ser un array de 70 elementos' 
      }, { status: 400 })
    }

    if (!Array.isArray(practicalAnswers) || practicalAnswers.length !== 15) {
      return NextResponse.json({ 
        error: 'practicalAnswers debe ser un array de 15 elementos' 
      }, { status: 400 })
    }

    // Obtener el examen oficial con las respuestas correctas
    const exam = await prisma.examOfficial.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        testQuestions: true,
        practicalCase: true,
        published: true,
        active: true
      }
    })

    if (!exam || !exam.published) {
      return NextResponse.json({ 
        error: 'Examen no encontrado o no disponible' 
      }, { status: 404 })
    }

    // Parsear preguntas
    let testQuestions: any[] = []
    let practicalCase: any = { questions: [] }

    try {
      testQuestions = JSON.parse(exam.testQuestions)
      practicalCase = JSON.parse(exam.practicalCase)
    } catch (parseError) {
      console.error('[Submit Exam] Parse error:', parseError)
      return NextResponse.json({ 
        error: 'Error al procesar el examen' 
      }, { status: 500 })
    }

    // ========================================================================
    // PARTE 1: CALCULAR PUNTUACIÓN TEST (70 PREGUNTAS)
    // ========================================================================
    let testCorrect = 0
    let testIncorrect = 0
    let testBlank = 0

    const testResults: any[] = []

    for (let i = 0; i < 70; i++) {
      const userAnswer = testAnswers[i] || ''
      const correctAnswer = testQuestions[i].correctAnswer
      const isBlank = userAnswer === '' || !userAnswer
      const isCorrect = !isBlank && userAnswer === correctAnswer

      if (isBlank) {
        testBlank++
      } else if (isCorrect) {
        testCorrect++
      } else {
        testIncorrect++
      }

      testResults.push({
        questionIndex: i,
        userAnswer,
        correctAnswer,
        isCorrect,
        isBlank,
        explanation: testQuestions[i].explanation
      })
    }

    // Puntuación bruta: correctas - (incorrectas * 0.25)
    const testRawScore = testCorrect - (testIncorrect * 0.25)
    
    // Transformar a escala sobre 50
    // Fórmula: (rawScore / 70) * 50
    // Si rawScore < 0, la puntuación es 0
    const testScore = Math.max(0, (testRawScore / 70) * 50)

    // ========================================================================
    // PARTE 2: CALCULAR PUNTUACIÓN SUPUESTO PRÁCTICO (15 PREGUNTAS)
    // ========================================================================
    let practicalCorrect = 0
    let practicalIncorrect = 0
    let practicalBlank = 0

    const practicalResults: any[] = []

    for (let i = 0; i < 15; i++) {
      const userAnswer = practicalAnswers[i] || ''
      const correctAnswer = practicalCase.questions[i].correctAnswer
      const isBlank = userAnswer === '' || !userAnswer
      const isCorrect = !isBlank && userAnswer === correctAnswer

      if (isBlank) {
        practicalBlank++
      } else if (isCorrect) {
        practicalCorrect++
      } else {
        practicalIncorrect++
      }

      practicalResults.push({
        questionIndex: i,
        userAnswer,
        correctAnswer,
        isCorrect,
        isBlank,
        explanation: practicalCase.questions[i].explanation
      })
    }

    // Puntuación bruta: correctas - (incorrectas * 0.25)
    const practicalRawScore = practicalCorrect - (practicalIncorrect * 0.25)
    
    // Transformar a escala sobre 50
    const practicalScore = Math.max(0, (practicalRawScore / 15) * 50)

    // ========================================================================
    // PUNTUACIÓN TOTAL (SOBRE 100)
    // ========================================================================
    const totalScore = testScore + practicalScore

    // ========================================================================
    // GUARDAR INTENTO EN BASE DE DATOS
    // ========================================================================
    const attempt = await prisma.examOfficialAttempt.create({
      data: {
        examId: exam.id,
        userId: user.id,
        testAnswers: JSON.stringify(testAnswers),
        practicalAnswers: JSON.stringify(practicalAnswers),
        testCorrect,
        testIncorrect,
        testBlank,
        testRawScore,
        testScore,
        practicalCorrect,
        practicalIncorrect,
        practicalBlank,
        practicalRawScore,
        practicalScore,
        totalScore,
        timeSpent: timeSpent || 0,
        completed: true,
        completedAt: new Date()
      }
    })

    // ========================================================================
    // ACTUALIZAR O CREAR RANKING
    // ========================================================================
    // Calcular posición en el ranking
    const betterScores = await prisma.examOfficialAttempt.count({
      where: {
        completed: true,
        totalScore: {
          gt: totalScore
        }
      }
    })

    const rank = betterScores + 1

    await prisma.examRanking.create({
      data: {
        userId: user.id,
        attemptId: attempt.id,
        rank,
        totalScore,
        userName: user.name || user.email
      }
    })

    // Recalcular rankings de todos (actualizar posiciones)
    await recalculateRankings()

    // ========================================================================
    // RETORNAR RESULTADOS COMPLETOS
    // ========================================================================
    return NextResponse.json({
      success: true,
      attempt: {
        id: attempt.id,
        examTitle: exam.title,
        
        // Estadísticas Parte 1 (Test)
        test: {
          correct: testCorrect,
          incorrect: testIncorrect,
          blank: testBlank,
          rawScore: parseFloat(testRawScore.toFixed(2)),
          score: parseFloat(testScore.toFixed(2)),
          results: testResults
        },
        
        // Estadísticas Parte 2 (Supuesto Práctico)
        practical: {
          correct: practicalCorrect,
          incorrect: practicalIncorrect,
          blank: practicalBlank,
          rawScore: parseFloat(practicalRawScore.toFixed(2)),
          score: parseFloat(practicalScore.toFixed(2)),
          results: practicalResults
        },
        
        // Total
        totalScore: parseFloat(totalScore.toFixed(2)),
        rank,
        timeSpent,
        completedAt: attempt.completedAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('[Submit Exam Official] Error:', error)
    return NextResponse.json({ 
      error: 'Error al procesar el examen',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// ============================================================================
// Función auxiliar para recalcular todos los rankings
// ============================================================================
async function recalculateRankings() {
  try {
    // Obtener todos los intentos completados ordenados por puntuación descendente
    const attempts = await prisma.examOfficialAttempt.findMany({
      where: { completed: true },
      orderBy: { totalScore: 'desc' },
      select: {
        id: true,
        userId: true,
        totalScore: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Actualizar rankings
    for (let i = 0; i < attempts.length; i++) {
      const att = attempts[i]
      await prisma.examRanking.upsert({
        where: { attemptId: att.id },
        update: {
          rank: i + 1,
          totalScore: att.totalScore
        },
        create: {
          attemptId: att.id,
          userId: att.userId,
          rank: i + 1,
          totalScore: att.totalScore,
          userName: att.user.name || att.user.email
        }
      })
    }
  } catch (error) {
    console.error('[Recalculate Rankings] Error:', error)
  }
}
