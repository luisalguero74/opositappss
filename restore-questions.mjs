/**
 * Script para restaurar preguntas desde questions-export.json
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Iniciando restauración de preguntas...\n')

  // Leer archivo de exportación
  const data = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  
  console.log(`📊 Datos del backup:`)
  console.log(`   Total preguntas: ${data.totalQuestions}`)
  console.log(`   Total cuestionarios: ${data.totalQuestionnaires}\n`)

  let totalRestored = 0
  let totalErrors = 0

  // Primero verificar cuestionarios
  console.log('🔍 Verificando cuestionarios...')
  const existingQuestionnaires = await prisma.questionnaire.findMany({
    select: { id: true }
  })
  const existingIds = new Set(existingQuestionnaires.map(q => q.id))
  console.log(`   Cuestionarios existentes: ${existingQuestionnaires.length}\n`)

  // Restaurar por cuestionario
  for (const questionnaire of data.data) {
    console.log(`\n📝 Procesando cuestionario: ${questionnaire.questionnaireId}`)
    console.log(`   Preguntas a restaurar: ${questionnaire.questionCount}`)

    // Verificar si el cuestionario existe
    if (!existingIds.has(questionnaire.questionnaireId)) {
      console.log(`   ⚠️  Cuestionario no existe, saltando...`)
      totalErrors += questionnaire.questions.length
      continue
    }

    // Restaurar preguntas en lotes
    const batchSize = 50
    for (let i = 0; i < questionnaire.questions.length; i += batchSize) {
      const batch = questionnaire.questions.slice(i, i + batchSize)
      
      try {
        await prisma.question.createMany({
          data: batch.map(q => ({
            questionnaireId: q.questionnaireId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            temaCodigo: q.temaCodigo || null,
            temaNumero: q.temaNumero || null,
            temaParte: q.temaParte || null,
            temaTitulo: q.temaTitulo || null,
            difficulty: q.difficulty || null,
            // Campos nuevos con valores por defecto
            aiReviewed: false,
            aiReviewedAt: null
          })),
          skipDuplicates: true
        })

        totalRestored += batch.length
        console.log(`   ✅ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} preguntas restauradas`)
      } catch (error) {
        console.error(`   ❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error.message)
        totalErrors += batch.length
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE RESTAURACIÓN')
  console.log('='.repeat(60))
  console.log(`✅ Preguntas restauradas:  ${totalRestored}`)
  console.log(`❌ Errores:                ${totalErrors}`)
  console.log(`📦 Total en backup:        ${data.totalQuestions}`)
  console.log('='.repeat(60))

  // Verificar total en BD
  const count = await prisma.question.count()
  console.log(`\n🔍 Verificación final: ${count} preguntas en la base de datos`)
}

main()
  .then(() => {
    console.log('\n✅ Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
