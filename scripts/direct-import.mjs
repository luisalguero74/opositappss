#!/usr/bin/env node

/**
 * Importación directa a PostgreSQL de producción
 * Uso: PROD_DATABASE_URL="postgresql://..." node scripts/direct-import.mjs
 */

import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import pg from 'pg'
const { Client } = pg

const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL

if (!PROD_DATABASE_URL) {
  console.error('❌ Error: Necesitas PROD_DATABASE_URL (o DATABASE_URL)')
  console.log('\nEjecuta:')
  console.log('PROD_DATABASE_URL="postgresql://user:pass@host/db" node scripts/direct-import.mjs')
  console.log('o')
  console.log('DATABASE_URL="postgresql://user:pass@host/db" node scripts/direct-import.mjs')
  process.exit(1)
}

function renderProgress(current, total, prefix = '') {
  const width = 28
  const safeTotal = Math.max(1, total)
  const ratio = Math.max(0, Math.min(1, current / safeTotal))
  const filled = Math.round(ratio * width)
  const bar = `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`
  const pct = Math.floor(ratio * 100)
  process.stdout.write(`\r${prefix}[${bar}] ${pct}% (${current}/${total})`)
}

async function main() {
  console.log('🚀 Importación directa a producción\n')
  
  // Cargar export
  const data = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  console.log(`📂 ${data.totalQuestions} preguntas, ${data.totalQuestionnaires} cuestionarios\n`)
  
  // Conectar a producción
  console.log('🔌 Conectando a base de datos de producción...')
  const client = new Client({ connectionString: PROD_DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅ Conectado\n')
  
  let imported = 0
  let totalQuestions = 0
  let importedQuestions = 0
  const totalGroups = data.data.length
  const expectedQuestions = data.totalQuestions || data.data.reduce((acc, g) => acc + (g.questions?.length || 0), 0)
  
  for (let i = 0; i < data.data.length; i++) {
    const group = data.data[i]
    const first = group.questions[0]
    
    const name = first.temaTitulo 
      ? `Test - ${first.temaTitulo}`
      : `Test ${first.temaCodigo || ''} - Tema ${first.temaNumero || i + 1}`
    
    const type = name.toLowerCase().includes('práctico') ? 'practical' : 'theory'
    
    console.log(`[${i + 1}/${totalGroups}] ${name} (${group.questions.length} preguntas)`)
    
    try {
      // Crear cuestionario
      const questionnaireId = randomUUID()
      const qRes = await client.query(
        `INSERT INTO "Questionnaire" (id, title, type, published, "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, true, NOW(), NOW())`,
        [questionnaireId, name, type]
      )
      
      // Insertar preguntas
      let groupImported = 0
      for (const q of group.questions) {
        const options = typeof q.options === 'string' ? q.options : JSON.stringify(q.options)
        const questionId = randomUUID()
        
        await client.query(
          `INSERT INTO "Question" 
           (id, "questionnaireId", text, options, "correctAnswer", explanation, 
            "temaCodigo", "temaNumero", "temaParte", "temaTitulo", difficulty, 
            "createdAt", "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
          [
            questionId,
            questionnaireId,
            q.text,
            options,
            q.correctAnswer,
            q.explanation || '',
            q.temaCodigo,
            q.temaNumero,
            q.temaParte,
            q.temaTitulo,
            q.difficulty || 'media'
          ]
        )

        groupImported++
        importedQuestions++
        if (groupImported % 25 === 0 || groupImported === group.questions.length) {
          renderProgress(importedQuestions, expectedQuestions, '📝 Progreso: ')
        }
      }
      
      imported++
      totalQuestions += group.questions.length
      process.stdout.write('\n')
      console.log(`  ✅ Importado\n`)
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`)
    }
  }
  
  await client.end()
  
  console.log('='.repeat(50))
  console.log(`✅ Cuestionarios: ${imported}`)
  console.log(`📝 Preguntas: ${totalQuestions}`)
  console.log('='.repeat(50))
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
