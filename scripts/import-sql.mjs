#!/usr/bin/env node

/**
 * Script ULTRA SIMPLIFICADO que solo usa SQL
 * Compatible con el schema de producción (sin aiReviewed)
 */

import pg from 'pg'
const { Client } = pg
import { readFileSync } from 'fs'

// La DATABASE_URL de producción - la necesitas de Vercel
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://...'

async function main() {
  if (!DATABASE_URL || DATABASE_URL === 'postgresql://...') {
    console.error('❌ Necesitas proporcionar DATABASE_URL de producción')
    console.error('   Cópiala desde: https://vercel.com/luisalguero74s-projects/opositappss/stores')
    console.error('   Luego ejecuta: DATABASE_URL="postgres://..." node scripts/import-sql.mjs')
    process.exit(1)
  }
  
  console.log('🚀 Conectando a producción...\n')
  
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  
  console.log('✅ Conectado\n')
  
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
      
      // Crear cuestionario
      const qResult = await client.query(`
        INSERT INTO "Questionnaire" (id, title, type, published, "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, $1, $2, true, NOW(), NOW())
        RETURNING id
      `, [title, type])
      
      const questionnaireId = qResult.rows[0].id
      
      // Crear preguntas
      for (const q of qGroup.questions) {
        const options = typeof q.options === 'string' ? q.options : JSON.stringify(q.options)
        
        await client.query(`
          INSERT INTO "Question" (
            id, "questionnaireId", text, options, "correctAnswer", explanation,
            "temaCodigo", "temaNumero", "temaParte", "temaTitulo", difficulty, "legalBasis",
            "createdAt", "updatedAt"
          )
          VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            NOW(), NOW()
          )
        `, [
          questionnaireId,
          q.text,
          options,
          q.correctAnswer,
          q.explanation || '',
          q.temaCodigo || null,
          q.temaNumero || null,
          q.temaParte || null,
          q.temaTitulo || null,
          q.difficulty || 'media',
          q.legalBasis || null
        ])
      }
      
      imported++
      console.log(`   ✅ Importado\n`)
    } catch (error) {
      failed++
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }
  
  await client.end()
  
  console.log('='.repeat(60))
  console.log(`✅ Cuestionarios importados: ${imported}`)
  console.log(`❌ Cuestionarios fallidos: ${failed}`)
  console.log(`📝 Total: ${exportData.totalQuestionnaires}`)
  console.log('='.repeat(60))
  
  if (imported > 0) {
    console.log(`\n🎉 Verifica en: https://opositappss.vercel.app/admin/questions`)
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error)
  process.exit(1)
})
