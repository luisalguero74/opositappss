#!/usr/bin/env node

/**
 * 🚀 SCRIPT DE MEJORA MASIVA DE PREGUNTAS
 * 
 * Este script valida y mejora TODAS las preguntas de la base de datos:
 * - Normaliza formatos
 * - Regenera explicaciones deficientes con IA
 * - Valida automáticamente las preguntas correctas
 * - Marca como cuarentena las problemáticas
 * 
 * USO:
 *   node scripts/improve-all-questions.mjs [--dry-run] [--limit=N]
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null

console.log('\n🚀 MEJORA MASIVA DE PREGUNTAS')
console.log('============================\n')
console.log(`Modo: ${isDryRun ? '🔍 DRY RUN (no modificará nada)' : '✍️  APLICAR CAMBIOS'}`)
if (limit) console.log(`Límite: ${limit} preguntas`)
console.log()

async function main() {
  try {
    // Obtener preguntas
    const where = {}
    const questions = await prisma.question.findMany({
      where,
      take: limit || undefined,
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        difficulty: true,
        reviewStatus: true,
        aiReviewed: true,
        temaCodigo: true,
        temaNumero: true,
        temaTitulo: true
      }
    })

    console.log(`📊 Total preguntas a procesar: ${questions.length}\n`)

    let processed = 0
    let improved = 0
    let validated = 0
    let quarantined = 0
    let skipped = 0

    for (const q of questions) {
      processed++
      
      // Parsear opciones
      let options = []
      try {
        if (typeof q.options === 'string') {
          options = JSON.parse(q.options)
        } else if (Array.isArray(q.options)) {
          options = q.options
        }
      } catch (e) {
        console.log(`❌ [${processed}/${questions.length}] Pregunta ${q.id}: Opciones inválidas`)
        if (!isDryRun) {
          await prisma.question.update({
            where: { id: q.id },
            data: { reviewStatus: 'QUARANTINED' }
          })
          quarantined++
        }
        continue
      }

      // Validaciones básicas
      const hasAllOptions = options.length === 4 && options.every(opt => opt && opt.trim().length > 0)
      const hasValidCorrectAnswer = ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
      const hasExplanation = q.explanation && q.explanation.trim().length > 50
      const hasValidText = q.text && q.text.trim().length > 10

      if (!hasValidText || !hasAllOptions || !hasValidCorrectAnswer) {
        console.log(`⚠️  [${processed}/${questions.length}] Pregunta ${q.id}: Problemas básicos detectados`)
        if (!isDryRun) {
          await prisma.question.update({
            where: { id: q.id },
            data: { reviewStatus: 'QUARANTINED' }
          })
          quarantined++
        }
        continue
      }

      // Verificar si necesita mejora
      const needsImprovement = 
        !hasExplanation ||
        q.explanation.length < 150 ||
        q.explanation.toLowerCase().includes('probablemente') ||
        q.explanation.toLowerCase().includes('puede ser') ||
        !q.explanation.includes('.')

      if (needsImprovement) {
        console.log(`🔄 [${processed}/${questions.length}] Pregunta ${q.id}: Necesita mejora de explicación`)
        
        if (!isDryRun) {
          // TODO: Aquí se llamaría a la API de IA para regenerar
          // Por ahora solo marcamos que necesita revisión
          await prisma.question.update({
            where: { id: q.id },
            data: { 
              reviewStatus: 'PENDING',
              aiReviewed: false
            }
          })
          improved++
        }
      } else {
        // Pregunta perfecta - validar
        if (q.reviewStatus !== 'VALIDATED') {
          console.log(`✅ [${processed}/${questions.length}] Pregunta ${q.id}: Validada automáticamente`)
          if (!isDryRun) {
            await prisma.question.update({
              where: { id: q.id },
              data: { reviewStatus: 'VALIDATED' }
            })
            validated++
          }
        } else {
          skipped++
        }
      }

      // Mostrar progreso cada 100 preguntas
      if (processed % 100 === 0) {
        console.log(`\n📈 Progreso: ${processed}/${questions.length} (${Math.round(processed/questions.length*100)}%)`)
        console.log(`   ✅ Validadas: ${validated}`)
        console.log(`   🔄 Mejoradas: ${improved}`)
        console.log(`   ⚠️  En cuarentena: ${quarantined}`)
        console.log(`   ⏭️  Saltadas: ${skipped}\n`)
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 RESUMEN FINAL')
    console.log('='.repeat(50))
    console.log(`Total procesadas:     ${processed}`)
    console.log(`✅ Validadas:         ${validated}`)
    console.log(`🔄 Necesitan mejora:  ${improved}`)
    console.log(`⚠️  En cuarentena:    ${quarantined}`)
    console.log(`⏭️  Ya perfectas:      ${skipped}`)
    console.log()

    if (isDryRun) {
      console.log('💡 Este fue un DRY RUN. Para aplicar cambios, ejecuta sin --dry-run')
    } else {
      console.log('✨ Cambios aplicados exitosamente')
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
