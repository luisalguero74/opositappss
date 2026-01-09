/**
 * Script completo de restauración de preguntas y cuestionarios
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Iniciando restauración COMPLETA de datos...\n')

  // Leer archivo de exportación
  const data = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  
  console.log(`📊 Datos del backup:`)
  console.log(`   Total preguntas: ${data.totalQuestions}`)
  console.log(`   Total cuestionarios: ${data.totalQuestionnaires}\n`)

  // Paso 1: Crear cuestionarios primero
  console.log('📝 PASO 1: Restaurando cuestionarios...\n')
  
  const questionnaires = data.data.map(q => {
    const firstQuestion = q.questions[0]
    // Determinar tipo basado en el nombre o contenido
    const isTheory = firstQuestion?.temaCodigo?.startsWith('G') || 
                     firstQuestion?.temaCodigo?.startsWith('E') || 
                     firstQuestion?.temaParte === 'GENERAL' ||
                     firstQuestion?.temaParte === 'ESPECÍFICO'
    
    return {
      id: q.questionnaireId,
      title: firstQuestion?.temaTitulo 
        ? `Test ${firstQuestion.temaCodigo || ''} - ${firstQuestion.temaTitulo}`
        : `Cuestionario ${q.questionnaireId.slice(-8)}`,
      type: isTheory ? 'theory' : 'practical',
      theme: firstQuestion?.temaCodigo || null,
      published: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  try {
    const result = await prisma.questionnaire.createMany({
      data: questionnaires,
      skipDuplicates: true
    })
    console.log(`✅ ${result.count} cuestionarios creados\n`)
  } catch (error) {
    console.error('❌ Error creando cuestionarios:', error.message)
    console.log('⚠️  Intentando crear uno por uno...\n')
    
    for (const q of questionnaires) {
      try {
        await prisma.questionnaire.create({ data: q })
        console.log(`   ✅ ${q.title}`)
      } catch (err) {
        console.log(`   ⚠️  ${q.title} - ${err.message}`)
      }
    }
  }

  // Paso 2: Restaurar preguntas
  console.log('\n📝 PASO 2: Restaurando preguntas...\n')
  
  let totalRestored = 0
  let totalErrors = 0

  for (const questionnaire of data.data) {
    console.log(`\n📋 Cuestionario: ${questionnaire.questionnaireId}`)
    console.log(`   Preguntas: ${questionnaire.questionCount}`)

    // Restaurar en lotes
    const batchSize = 100
    for (let i = 0; i < questionnaire.questions.length; i += batchSize) {
      const batch = questionnaire.questions.slice(i, i + batchSize)
      
      try {
        const created = await prisma.question.createMany({
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
            aiReviewed: false,
            aiReviewedAt: null
          })),
          skipDuplicates: true
        })

        totalRestored += created.count
        process.stdout.write(`   ✅ ${created.count} preguntas`)
      } catch (error) {
        totalErrors += batch.length
        process.stdout.write(`   ❌ Error: ${error.message}`)
      }
    }
  }

  console.log('\n\n' + '='.repeat(70))
  console.log('📊 RESUMEN DE RESTAURACIÓN')
  console.log('='.repeat(70))
  console.log(`✅ Cuestionarios creados:   ${questionnaires.length}`)
  console.log(`✅ Preguntas restauradas:   ${totalRestored}`)
  console.log(`❌ Errores:                 ${totalErrors}`)
  console.log(`📦 Total en backup:         ${data.totalQuestions}`)
  console.log('='.repeat(70))

  // Verificación final
  const finalCounts = await prisma.$transaction([
    prisma.questionnaire.count(),
    prisma.question.count()
  ])

  console.log(`\n🔍 VERIFICACIÓN FINAL:`)
  console.log(`   Cuestionarios en BD: ${finalCounts[0]}`)
  console.log(`   Preguntas en BD:     ${finalCounts[1]}`)
  
  if (finalCounts[1] === data.totalQuestions) {
    console.log(`\n🎉 ¡RESTAURACIÓN COMPLETA EXITOSA!`)
  } else {
    console.log(`\n⚠️  Faltan ${data.totalQuestions - finalCounts[1]} preguntas`)
  }
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
