#!/usr/bin/env node

/**
 * Script simplificado para importar preguntas a producción usando endpoint directo
 * Uso: node scripts/import-simple.mjs
 */

import { readFileSync } from 'fs'

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://opositappss.vercel.app'
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'opositapp-import-2026'

async function main() {
  console.log('🚀 Importando preguntas a producción...')
  console.log(`📍 URL: ${PRODUCTION_URL}\n`)
  
  // Cargar datos
  console.log('📂 Cargando questions-export.json...')
  const exportData = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  console.log(`✅ ${exportData.totalQuestions} preguntas en ${exportData.totalQuestionnaires} cuestionarios\n`)
  
  // Preparar cuestionarios
  const questionnaires = exportData.data.map((qGroup, i) => {
    const firstQuestion = qGroup.questions[0]
    let title = `Cuestionario ${i + 1}`
    
    if (firstQuestion.temaTitulo) {
      title = `Test - ${firstQuestion.temaTitulo}`
    } else if (firstQuestion.temaCodigo) {
      title = `Test ${firstQuestion.temaCodigo} - Tema ${firstQuestion.temaNumero || i + 1}`
    }
    
    const type = title.toLowerCase().includes('práctico') || 
                 title.toLowerCase().includes('supuesto') ? 'practical' : 'theory'
    
    return {
      title,
      type,
      questions: qGroup.questions.map(q => ({
        text: q.text,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        temaCodigo: q.temaCodigo || null,
        temaNumero: q.temaNumero || null,
        temaParte: q.temaParte || null,
        temaTitulo: q.temaTitulo || null,
        difficulty: q.difficulty || 'media'
      }))
    }
  })
  
  console.log('📤 Enviando a producción...\n')
  
  // Enviar en lotes de 2 para evitar timeouts
  const batchSize = 2
  let totalImported = 0
  let totalFailed = 0
  
  for (let i = 0; i < questionnaires.length; i += batchSize) {
    const batch = questionnaires.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(questionnaires.length / batchSize)
    
    console.log(`📦 Lote ${batchNum}/${totalBatches} (${batch.length} cuestionarios)`)
    
    try {
      const res = await fetch(`${PRODUCTION_URL}/api/admin/import-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${IMPORT_SECRET}`
        },
        body: JSON.stringify({ questionnaires: batch })
      })
      
      if (res.ok) {
        const data = await res.json()
        totalImported += data.imported
        totalFailed += data.failed
        
        console.log(`   ✅ Importados: ${data.imported}`)
        if (data.failed > 0) {
          console.log(`   ⚠️  Fallidos: ${data.failed}`)
          // Mostrar detalles de errores
          data.results.forEach(r => {
            if (!r.success) {
              console.log(`      - ${r.title}: ${r.error}`)
            }
          })
        }
      } else {
        const error = await res.text()
        console.error(`   ❌ Error HTTP ${res.status}: ${error.substring(0, 200)}`)
        totalFailed += batch.length
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      totalFailed += batch.length
    }
    
    console.log('')
    
    // Pausa entre lotes
    if (i + batchSize < questionnaires.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Resumen
  console.log('='.repeat(60))
  console.log('📊 RESUMEN')
  console.log('='.repeat(60))
  console.log(`✅ Cuestionarios importados: ${totalImported}`)
  console.log(`❌ Cuestionarios fallidos: ${totalFailed}`)
  console.log(`📝 Total: ${questionnaires.length}`)
  console.log('='.repeat(60))
  
  if (totalImported > 0) {
    console.log(`\n🎉 Verifica en: ${PRODUCTION_URL}/admin/questions`)
  }
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
})
