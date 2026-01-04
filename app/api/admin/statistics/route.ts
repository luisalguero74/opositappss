import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Si se solicita un usuario específico
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, createdAt: true }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const userAnswers = await prisma.userAnswer.findMany({
        where: { userId },
        include: {
          question: {
            include: {
              questionnaire: {
                select: {
                  title: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const totalQuestions = userAnswers.length
      const correctAnswers = userAnswers.filter(a => a.isCorrect).length
      const incorrectAnswers = totalQuestions - correctAnswers
      const successRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0

      // Errores por pregunta
      const errorsByQuestion = new Map<string, any>()
      userAnswers.forEach(answer => {
        if (!errorsByQuestion.has(answer.questionId)) {
          errorsByQuestion.set(answer.questionId, {
            questionId: answer.questionId,
            questionText: answer.question.text,
            questionnaireTitle: answer.question.questionnaire.title,
            questionnaireType: answer.question.questionnaire.type,
            attempts: 0,
            errors: 0,
            correctAnswer: answer.question.correctAnswer,
            explanation: answer.question.explanation
          })
        }
        const questionStats = errorsByQuestion.get(answer.questionId)!
        questionStats.attempts++
        if (!answer.isCorrect) questionStats.errors++
      })

      const repeatedErrors = Array.from(errorsByQuestion.values())
        .filter(q => q.errors > 0)
        .sort((a, b) => b.errors - a.errors)

      const statsByType = {
        theory: { total: 0, correct: 0, incorrect: 0 },
        practical: { total: 0, correct: 0, incorrect: 0 }
      }

      userAnswers.forEach(answer => {
        const type = answer.question.questionnaire.type as 'theory' | 'practical'
        statsByType[type].total++
        if (answer.isCorrect) {
          statsByType[type].correct++
        } else {
          statsByType[type].incorrect++
        }
      })

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
          .filter(a => !a.isCorrect)
          .slice(0, 20)
          .map(a => ({
            questionId: a.questionId,
            questionText: a.question.text,
            questionnaireTitle: a.question.questionnaire.title,
            questionnaireType: a.question.questionnaire.type,
            userAnswer: a.answer,
            correctAnswer: a.question.correctAnswer,
            explanation: a.question.explanation,
            date: a.createdAt
          }))
      })
    }

    // Estadísticas globales de todos los usuarios
    const allUsers = await prisma.user.findMany({
      where: { role: 'user' },
      select: { id: true, email: true, createdAt: true }
    })

    const allAnswers = await prisma.userAnswer.findMany({
      include: {
        user: { select: { email: true } },
        question: {
          include: {
            questionnaire: { select: { type: true } }
          }
        }
      }
    })

    // Estadísticas globales
    const globalTotal = allAnswers.length
    const globalCorrect = allAnswers.filter(a => a.isCorrect).length
    const globalIncorrect = globalTotal - globalCorrect
    const globalSuccessRate = globalTotal > 0 ? (globalCorrect / globalTotal) * 100 : 0

    // Por tipo global
    const globalByType = {
      theory: { total: 0, correct: 0 },
      practical: { total: 0, correct: 0 }
    }

    allAnswers.forEach(a => {
      const type = a.question.questionnaire.type as 'theory' | 'practical'
      globalByType[type].total++
      if (a.isCorrect) globalByType[type].correct++
    })

    // Estadísticas por usuario
    const userStats = allUsers.map(user => {
      const userAnswers = allAnswers.filter(a => a.userId === user.id)
      const total = userAnswers.length
      const correct = userAnswers.filter(a => a.isCorrect).length
      const successRate = total > 0 ? (correct / total) * 100 : 0

      const byType = {
        theory: { total: 0, correct: 0 },
        practical: { total: 0, correct: 0 }
      }

      userAnswers.forEach(a => {
        const type = a.question.questionnaire.type as 'theory' | 'practical'
        byType[type].total++
        if (a.isCorrect) byType[type].correct++
      })

      return {
        userId: user.id,
        email: user.email,
        memberSince: user.createdAt,
        totalQuestions: total,
        correctAnswers: correct,
        incorrectAnswers: total - correct,
        successRate: Math.round(successRate * 100) / 100,
        theoryTotal: byType.theory.total,
        theoryCorrect: byType.theory.correct,
        practicalTotal: byType.practical.total,
        practicalCorrect: byType.practical.correct
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
            successRate: globalByType.theory.total > 0
              ? Math.round((globalByType.theory.correct / globalByType.theory.total) * 10000) / 100
              : 0
          },
          practical: {
            total: globalByType.practical.total,
            correct: globalByType.practical.correct,
            successRate: globalByType.practical.total > 0
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
