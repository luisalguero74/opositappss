import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'
import { getCorrectAnswerLetter, normalizeSelectedAnswerToLetter, safeParseOptions } from '@/lib/answer-normalization'

/**
 * API para registrar intentos de cuestionarios generados (desde HTML)
 * Vincula completamente con sistema de estadísticas avanzadas
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const {
      questionnaireId,
      questionIds,
      answers, // { [questionId]: correctAnswer }
      timeSpent, // en segundos
      tema,
      difficulty,
      totalCorrect,
      totalQuestions,
      percentage
    } = await req.json()

    // 1. Buscar o crear el cuestionario si no existe
    let questionnaire = null
    if (questionnaireId) {
      questionnaire = await prisma.questionnaire.findUnique({
        where: { id: questionnaireId }
      })
    } else {
      // Si no hay ID, crear uno temporal para este intento
      questionnaire = await prisma.questionnaire.create({
        data: {
          title: `Test generado - ${tema || 'General'}`,
          type: 'theory',
          theme: tema,
          published: false // No publicado, solo para estadísticas
        }
      })
    }

    if (!questionnaire) {
      return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
    }

    // 2. Registrar el intento en QuestionnaireAttempt (crearlo antes para poder vincular attemptId si existe)
    const attempt = await prisma.questionnaireAttempt.create({
      data: {
        userId: session.user.id,
        questionnaireId: questionnaire.id,
        score: percentage,
        correctAnswers: totalCorrect,
        totalQuestions: totalQuestions,
        timeSpent: Math.round(timeSpent / 60), // convertir a minutos
        completedAt: new Date(),
        createdAt: new Date()
      }
    })

    // 3. Registrar cada respuesta del usuario como UserAnswer (via SQL por drift de columnas)
    const userAnswers = []
    const pool = getPgPool()
    const { answerColumn, hasAttemptId } = await getUserAnswerColumnInfo(pool)

    for (const [qId, userAnswer] of Object.entries(answers)) {
      // Buscar la pregunta
      const question = await prisma.question.findUnique({
        where: { id: qId }
      }).catch(() => null)

      if (question) {
        const options = safeParseOptions((question as any).options)
        const correctLetter = getCorrectAnswerLetter(String((question as any).correctAnswer ?? ''), options)
        const selectedLetter = normalizeSelectedAnswerToLetter(String(userAnswer ?? ''), options)
        const isCorrect =
          (correctLetter && selectedLetter && correctLetter === selectedLetter) ||
          String(userAnswer ?? '').trim().toLowerCase() === String((question as any).correctAnswer ?? '').trim().toLowerCase()

        const cols = ['userId', 'questionId', 'questionnaireId', answerColumn, 'isCorrect']
        const params: any[] = [session.user.id, qId, questionnaire.id, String(userAnswer ?? ''), Boolean(isCorrect)]
        if (hasAttemptId) {
          cols.splice(3, 0, 'attemptId')
          params.splice(3, 0, attempt.id)
        }

        await pool.query(
          `insert into "UserAnswer" (${cols.map(c => `"${c}"`).join(', ')}) values (${params.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
          params
        )

        userAnswers.push({ questionId: qId })
      }
    }

    // 4. Actualizar estadísticas del usuario (StudySession)
    await prisma.studySession.create({
      data: {
        userId: session.user.id,
        startedAt: new Date(Date.now() - timeSpent * 1000),
        endedAt: new Date(),
        duration: timeSpent,
        questionsAnswered: totalQuestions,
        correctAnswers: totalCorrect,
        type: 'practice',
        topics: JSON.stringify([tema])
      }
    })

    // 5. Actualizar StudyStreak si es necesario
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let streak = await prisma.studyStreak.findUnique({
      where: { userId: session.user.id }
    }).catch(() => null)

    if (!streak) {
      streak = await prisma.studyStreak.create({
        data: {
          userId: session.user.id,
          currentStreak: 1,
          longestStreak: 1,
          totalStudyDays: 1,
          lastStudyDate: new Date()
        }
      })
    } else {
      const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : new Date()
      lastStudy.setHours(0, 0, 0, 0)
      
      const isToday = lastStudy.getTime() === today.getTime()
      const isYesterday = lastStudy.getTime() === new Date(today.getTime() - 86400000).getTime()

      let newStreak = streak.currentStreak
      if (!isToday && isYesterday) {
        newStreak++
      } else if (!isToday) {
        newStreak = 1
      }

      streak = await prisma.studyStreak.update({
        where: { userId: session.user.id },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(streak.longestStreak, newStreak),
          totalStudyDays: isToday ? streak.totalStudyDays : streak.totalStudyDays + 1,
          lastStudyDate: new Date()
        }
      })
    }

    // 6. Verificar logros (achievements)
    await checkAchievements(session.user.id, percentage, totalCorrect, totalQuestions)

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      score: percentage,
      correctAnswers: totalCorrect,
      totalQuestions: totalQuestions,
      timeSpent,
      streakUpdated: streak.currentStreak,
      userAnswersRecorded: userAnswers.length
    }, { status: 201 })
  } catch (error) {
    console.error('Error registrando intento:', error)
    return NextResponse.json(
      { error: 'Error al registrar el intento' },
      { status: 500 }
    )
  }
}

/**
 * Verificar y desbloquear logros basados en el desempeño
 */
async function checkAchievements(userId: string, percentage: number, correct: number, total: number) {
  try {
    const achievements: { code: string; condition: boolean }[] = [
      { code: 'first_attempt', condition: true },
      { code: 'perfect_score', condition: percentage === 100 },
      { code: 'high_score_80', condition: percentage >= 80 },
      { code: 'high_score_90', condition: percentage >= 90 },
      { code: 'flawless_10', condition: percentage === 100 && total === 10 },
    ]

    for (const { code, condition } of achievements) {
      if (condition) {
        const achievement = await prisma.achievement.findUnique({
          where: { code }
        }).catch(() => null)

        if (achievement) {
          const exists = await prisma.userAchievement.findUnique({
            where: {
              userId_achievementId: {
                userId,
                achievementId: achievement.id
              }
            }
          }).catch(() => null)

          if (!exists) {
            await prisma.userAchievement.create({
              data: {
                userId,
                achievementId: achievement.id,
                unlockedAt: new Date()
              }
            }).catch(() => {})
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievements:', error)
  }
}
