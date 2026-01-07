import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

async function exportQuestions() {
  console.log('📤 Exportando preguntas de base de datos local...\n')
  
  try {
    // Obtener todas las preguntas con temaCodigo
    const questions = await prisma.question.findMany({
      where: {
        temaCodigo: { not: null }
      },
      select: {
        questionnaireId: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
        temaNumero: true,
        temaParte: true,
        temaTitulo: true,
        difficulty: true
      },
      orderBy: [
        { temaParte: 'asc' },
        { temaNumero: 'asc' }
      ]
    })

    console.log(`✅ Encontradas ${questions.length} preguntas\n`)

    // Agrupar por cuestionario
    const questionsByQuestionnaire = new Map()
    
    for (const q of questions) {
      if (!questionsByQuestionnaire.has(q.questionnaireId)) {
        questionsByQuestionnaire.set(q.questionnaireId, [])
      }
      questionsByQuestionnaire.get(q.questionnaireId).push(q)
    }

    console.log(`📋 Agrupadas en ${questionsByQuestionnaire.size} cuestionarios\n`)

    // Guardar en archivo JSON para importar
    const exportData = {
      totalQuestions: questions.length,
      totalQuestionnaires: questionsByQuestionnaire.size,
      data: Array.from(questionsByQuestionnaire.entries()).map(([qId, qs]) => ({
        questionnaireId: qId,
        questionCount: qs.length,
        questions: qs
      }))
    }

    writeFileSync('questions-export.json', JSON.stringify(exportData, null, 2))
    
    console.log('✅ Exportación guardada en: questions-export.json')
    console.log('\n📊 Resumen:')
    exportData.data.forEach((q, i) => {
      console.log(`   ${i + 1}. Cuestionario ${q.questionnaireId.substring(0, 8)}... - ${q.questionCount} preguntas`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

exportQuestions()
