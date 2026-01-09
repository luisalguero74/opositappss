#!/usr/bin/env node

/**
 * Script para importar preguntas a producción
 * Uso: ADMIN_EMAIL=x@x.com ADMIN_PASSWORD=xxx node scripts/import-to-production.mjs
 */

import { readFileSync } from 'fs'

const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://opositappss.vercel.app'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Error: Necesitas configurar ADMIN_EMAIL y ADMIN_PASSWORD')
  console.log('Ejemplo: ADMIN_EMAIL=admin@email.com ADMIN_PASSWORD=tu-password node scripts/import-to-production.mjs')
  process.exit(1)
}

async function main() {
  console.log('🚀 Importando preguntas a producción...')
  console.log(`📍 URL: ${PRODUCTION_URL}\n`)
  
  // Cargar datos locales
  console.log('📂 Cargando questions-export.json...')
  const exportData = JSON.parse(readFileSync('questions-export.json', 'utf-8'))
  console.log(`✅ ${exportData.totalQuestions} preguntas en ${exportData.totalQuestionnaires} cuestionarios\n`)
  
  // Login con NextAuth
  console.log('🔐 Autenticando...')
  const loginRes = await fetch(`${PRODUCTION_URL}/api/auth/signin`, {
    method: 'GET',
    redirect: 'manual'
  })
  
  // Necesitamos obtener el CSRF token
  const csrfRes = await fetch(`${PRODUCTION_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  
  // Login
  const authRes = await fetch(`${PRODUCTION_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      csrfToken: csrfToken,
      callbackUrl: `${PRODUCTION_URL}/admin`,
      json: 'true'
    }),
    redirect: 'manual'
  })
  
  const cookies = authRes.headers.get('set-cookie')
  
  if (!cookies || !cookies.includes('next-auth.session-token')) {
    console.error('❌ Error de autenticación')
    console.error('Status:', authRes.status)
    const text = await authRes.text()
    console.error('Respuesta:', text.substring(0, 200))
    process.exit(1)
  }
  
  console.log('✅ Sesión iniciada\n')
  
  // Importar cuestionarios
  console.log('📝 Importando cuestionarios...\n')
  let imported = 0
  let failed = 0
  let totalQuestionsImported = 0
  
  for (let i = 0; i < exportData.data.length; i++) {
    const qGroup = exportData.data[i]
    const questionnaireNumber = i + 1
    
    // Generar nombre basándose en el primer tema si existe
    const firstQuestion = qGroup.questions[0]
    let questionnaireName = `Cuestionario ${questionnaireNumber}`
    
    if (firstQuestion.temaTitulo) {
      questionnaireName = `Test - ${firstQuestion.temaTitulo}`
    } else if (firstQuestion.temaCodigo) {
      questionnaireName = `Test ${firstQuestion.temaCodigo} - Tema ${firstQuestion.temaNumero || questionnaireNumber}`
    }
    
    // Determinar tipo
    const type = questionnaireName.toLowerCase().includes('práctico') || 
                 questionnaireName.toLowerCase().includes('supuesto') ? 'practical' : 'theory'
    
    console.log(`  [${questionnaireNumber}/${exportData.data.length}] ${questionnaireName}`)
    console.log(`      ${qGroup.questions.length} preguntas, tipo: ${type}`)
    
    // Formatear preguntas para la API
    const questionsFormatted = qGroup.questions.map(q => {
      const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
      
      return {
        text: q.text,
        options: options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        temaCodigo: q.temaCodigo || null,
        temaNumero: q.temaNumero || null,
        temaParte: q.temaParte || null,
        temaTitulo: q.temaTitulo || null,
        difficulty: q.difficulty || 'media'
      }
    })
    
    try {
      const res = await fetch(`${PRODUCTION_URL}/api/admin/questionnaires`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies
        },
        body: JSON.stringify({
          title: questionnaireName,
          type: type,
          questions: questionsFormatted,
          published: true
        })
      })
      
      if (res.ok) {
        imported++
        totalQuestionsImported += qGroup.questions.length
        console.log(`      ✅ Importado correctamente\n`)
      } else {
        failed++
        const errorText = await res.text()
        console.error(`      ❌ Error HTTP ${res.status}`)
        console.error(`      ${errorText.substring(0, 150)}\n`)
      }
    } catch (error) {
      failed++
      console.error(`      ❌ Error: ${error.message}\n`)
    }
    
    // Pausa para no saturar
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  // Resumen
  console.log('='.repeat(60))
  console.log('📊 RESUMEN DE IMPORTACIÓN')
  console.log('='.repeat(60))
  console.log(`✅ Cuestionarios importados: ${imported}`)
  console.log(`❌ Cuestionarios fallidos: ${failed}`)
  console.log(`📝 Total preguntas importadas: ${totalQuestionsImported}`)
  console.log('='.repeat(60))
  
  if (imported > 0) {
    console.log(`\n🎉 ¡Importación completada!`)
    console.log(`   Ver en: ${PRODUCTION_URL}/admin/questions`)
  }
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error.message)
  console.error(error.stack)
  process.exit(1)
})
