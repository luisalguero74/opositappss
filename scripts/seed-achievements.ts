import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando logros iniciales...')

  const achievements = [
    {
      code: 'first_question',
      name: 'Primera Pregunta',
      description: 'Responde tu primera pregunta',
      icon: '🎯',
      category: 'estudio',
      requirement: JSON.stringify({ questionsAnswered: 1 }),
      points: 10
    },
    {
      code: 'streak_3',
      name: 'Racha de 3 días',
      description: 'Estudia 3 días seguidos',
      icon: '🔥',
      category: 'estudio',
      requirement: JSON.stringify({ currentStreak: 3 }),
      points: 50
    },
    {
      code: 'streak_7',
      name: 'Racha de 7 días',
      description: 'Estudia 7 días seguidos',
      icon: '⭐',
      category: 'estudio',
      requirement: JSON.stringify({ currentStreak: 7 }),
      points: 100
    },
    {
      code: 'streak_30',
      name: 'Racha de 30 días',
      description: 'Estudia 30 días seguidos',
      icon: '💪',
      category: 'estudio',
      requirement: JSON.stringify({ currentStreak: 30 }),
      points: 500
    },
    {
      code: 'questions_100',
      name: '100 Preguntas',
      description: 'Responde 100 preguntas correctamente',
      icon: '📚',
      category: 'estudio',
      requirement: JSON.stringify({ correctAnswers: 100 }),
      points: 100
    },
    {
      code: 'questions_500',
      name: '500 Preguntas',
      description: 'Responde 500 preguntas correctamente',
      icon: '🎓',
      category: 'estudio',
      requirement: JSON.stringify({ correctAnswers: 500 }),
      points: 250
    },
    {
      code: 'questions_1000',
      name: '1000 Preguntas',
      description: 'Responde 1000 preguntas correctamente',
      icon: '🏆',
      category: 'estudio',
      requirement: JSON.stringify({ correctAnswers: 1000 }),
      points: 500
    },
    {
      code: 'perfect_score',
      name: 'Perfeccionista',
      description: 'Completa un test con 100% de aciertos',
      icon: '💯',
      category: 'examenes',
      requirement: JSON.stringify({ perfectTest: true }),
      points: 150
    },
    {
      code: 'exam_passed',
      name: 'Examen Aprobado',
      description: 'Aprueba un simulacro de examen',
      icon: '✅',
      category: 'examenes',
      requirement: JSON.stringify({ examsPassed: 1 }),
      points: 200
    },
    {
      code: 'master_temario',
      name: 'Maestro del Temario',
      description: 'Completa todos los temas',
      icon: '👑',
      category: 'estudio',
      requirement: JSON.stringify({ allTemasCompleted: true }),
      points: 1000
    },
    {
      code: 'study_hours_10',
      name: 'Estudioso',
      description: 'Dedica 10 horas de estudio',
      icon: '📖',
      category: 'estudio',
      requirement: JSON.stringify({ studyHours: 10 }),
      points: 300
    },
    {
      code: 'precision_90',
      name: 'Experto',
      description: 'Alcanza 90% de precisión global',
      icon: '🎖️',
      category: 'estudio',
      requirement: JSON.stringify({ precision: 90 }),
      points: 400
    }
  ]

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: achievement,
      create: achievement
    })
  }

  console.log('✅ Logros sembrados correctamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
