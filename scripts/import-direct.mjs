#!/usr/bin/env node

/**
 * Script de importación directa usando Prisma generado desde schema
 * Sin usar campos que no existen en producción
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Importando preguntas a producción (método directo)...\n')
  
  // Cargar datos
  console.log('📂 Cargando questions-export.json...')
  const exportData = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  console.log(`✅ ${exportData.totalQuestions} preguntas en ${exportData.totalQuestionnaires} cuestionarios\n`)
  
  let imported = 0
  let failed = 0
  
  for (const qGroup of exportData.data) {
    const firstQuestion = qGroup.questions[0]
    let title = `Cuestionario ${imported + failed + 1}`
    
    if (firstQuestion.temaTitulo) {
      title = `Test - ${firstQuestion.temaTitulo}`
    } else if (firstQuestion.temaCodigo) {
      title = `Test ${firstQuestion.temaCodigo} - Tema ${firstQuestion.temaNumero || imported + failed + 1}`
    }
    
    const type = title.toLowerCase().includes('práctico') || 
                 title.toLowerCase().includes('supuesto') ? 'practical' : 'theory'
    
    try {
      console.log(`📝 ${title} (${qGroup.questions.length} preguntas)`)
      
      const questionnaire = await prisma.questionnaire.create({
        data: {
          title,
          type,
          published: true
        }
      })
      
      // Crear preguntas una por una para mejor control de errores
      for (const q of qGroup.questions) {
        const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: q.text,
            options: JSON.stringify(options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            temaCodigo: q.temaCodigo || null,
            temaNumero: q.temaNumero || null,
            temaParte: q.temaParte || null,
            temaTitulo: q.temaTitulo || null,
            difficulty: q.difficulty || 'media',
            legalBasis: q.legalBasis || null
          }
        })
      }
      
      imported++
      console.log(`   ✅ Importado\n`)
    } catch (error) {
      failed++
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }
  
  console.log('='.repeat(60))
  console.log(`✅ Cuestionarios importados: ${imported}`)
  console.log(`❌ Cuestionarios fallidos: ${failed}`)
  console.log(`📝 Total: ${exportData.totalQuestionnaires}`)
  console.log('='.repeat(60))
  
  if (imported > 0) {
    console.log(`\n🎉 Verifica en: https://opositappss.vercel.app/admin/questions`)
  }
}

main()
  .catch(error => {
    console.error('\n❌ Error fatal:', error.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
