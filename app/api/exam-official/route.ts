import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ============================================================================
// GET - Obtener examen oficial activo (para usuarios)
// ============================================================================
export async function GET(req: NextRequest) {
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

    // Buscar el examen oficial activo
    const exam = await prisma.examOfficial.findFirst({
      where: {
        published: true,
        active: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        testQuestions: true,
        practicalCase: true,
        createdAt: true
      }
    })

    if (!exam) {
      return NextResponse.json({ 
        error: 'No hay ningún examen oficial disponible en este momento' 
      }, { status: 404 })
    }

    // Parsear JSON
    let testQuestions = []
    let practicalCase = { statement: '', questions: [] }

    try {
      testQuestions = JSON.parse(exam.testQuestions)
      practicalCase = JSON.parse(exam.practicalCase)
    } catch (parseError) {
      console.error('[Exam Official] Parse error:', parseError)
      return NextResponse.json({ 
        error: 'Error al procesar el examen' 
      }, { status: 500 })
    }

    // Verificar si el usuario ya ha realizado este examen
    const existingAttempt = await prisma.examOfficialAttempt.findFirst({
      where: {
        examId: exam.id,
        userId: user.id,
        completed: true
      },
      select: {
        id: true,
        totalScore: true,
        completedAt: true
      }
    })

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        testQuestions: testQuestions.map((q: any) => ({
          text: q.text,
          options: q.options
          // NO enviar correctAnswer ni explanation hasta después de enviar
        })),
        practicalCase: {
          statement: practicalCase.statement,
          questions: practicalCase.questions.map((q: any) => ({
            text: q.text,
            options: q.options
            // NO enviar correctAnswer ni explanation
          }))
        },
        createdAt: exam.createdAt
      },
      hasCompleted: !!existingAttempt,
      previousAttempt: existingAttempt ? {
        totalScore: existingAttempt.totalScore,
        completedAt: existingAttempt.completedAt
      } : null
    })

  } catch (error) {
    console.error('[Exam Official GET] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener examen oficial',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
