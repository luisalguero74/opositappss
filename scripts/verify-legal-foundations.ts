import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Función para extraer fundamento legal (versión simplificada del API)
function extractLegalArticleSimple(explanation: string, correctAnswer: string, questionText: string): string | null {
  const patterns = [
    /art[íi]culo\s+\d+(\.\d+)?(\s+(?:bis|ter|quater|quinquies))?/gi,
    /art\.\s*\d+(\.\d+)?/gi,
    /ley\s+\d+\/\d+/gi,
    /real\s+decreto\s+legislativo\s+\d+\/\d+/gi,
    /real\s+decreto\s+\d+\/\d+/gi,
    /RDL\s+\d+\/\d+/gi,
    /RD\s+\d+\/\d+/gi,
    /disposición\s+adicional\s+\w+/gi,
    /disposición\s+transitoria\s+\w+/gi,
    /disposición\s+final\s+\w+/gi,
  ]

  const textsToSearch = [explanation, correctAnswer, questionText].filter(Boolean)
  
  for (const text of textsToSearch) {
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches && matches[0]) {
        return matches[0].trim()
      }
    }
  }

  return null
}

async function verifyLegalFoundations() {
  console.log('🔍 Verificando fundamentos legales en la base de datos...\n')

  try {
    // Obtener todas las preguntas
    const questions = await prisma.question.findMany({
      select: {
        id: true,
        text: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
        temaTitulo: true,
      }
    })

    console.log(`📊 Total de preguntas: ${questions.length}\n`)

    // Estadísticas
    const stats = {
      withLegalReference: 0,
      withoutLegalReference: 0,
      withArticle: 0,
      withLaw: 0,
      withDecree: 0,
      withDisposition: 0,
      byTheme: new Map<string, { total: number, withRef: number }>()
    }

    const questionsWithoutRef: Array<{
      id: string
      text: string
      tema: string | null
    }> = []

    // Analizar cada pregunta
    for (const question of questions) {
      const legalRef = extractLegalArticleSimple(
        question.explanation || '',
        question.correctAnswer || '',
        question.text || ''
      )

      const tema = question.temaTitulo || question.temaCodigo || 'Sin tema'

      // Actualizar estadísticas por tema
      if (!stats.byTheme.has(tema)) {
        stats.byTheme.set(tema, { total: 0, withRef: 0 })
      }
      const themeStats = stats.byTheme.get(tema)!
      themeStats.total++

      if (legalRef) {
        stats.withLegalReference++
        themeStats.withRef++

        // Clasificar tipo de referencia
        if (/art[íi]culo|art\./i.test(legalRef)) stats.withArticle++
        if (/ley/i.test(legalRef)) stats.withLaw++
        if (/decreto/i.test(legalRef)) stats.withDecree++
        if (/disposición/i.test(legalRef)) stats.withDisposition++
      } else {
        stats.withoutLegalReference++
        questionsWithoutRef.push({
          id: question.id,
          text: question.text.substring(0, 80) + '...',
          tema
        })
      }
    }

    // Mostrar resultados
    console.log('📈 RESULTADOS GENERALES')
    console.log('=' .repeat(60))
    console.log(`✅ Preguntas con referencia legal: ${stats.withLegalReference} (${Math.round(stats.withLegalReference / questions.length * 100)}%)`)
    console.log(`❌ Preguntas sin referencia legal: ${stats.withoutLegalReference} (${Math.round(stats.withoutLegalReference / questions.length * 100)}%)`)
    console.log('')
    console.log('📋 TIPOS DE REFERENCIAS')
    console.log('=' .repeat(60))
    console.log(`📄 Con artículos: ${stats.withArticle}`)
    console.log(`📜 Con leyes: ${stats.withLaw}`)
    console.log(`📋 Con decretos: ${stats.withDecree}`)
    console.log(`📌 Con disposiciones: ${stats.withDisposition}`)
    console.log('')

    console.log('📚 ESTADÍSTICAS POR TEMA')
    console.log('=' .repeat(60))
    
    // Ordenar temas por porcentaje de referencias
    const themeStatsArray = Array.from(stats.byTheme.entries())
      .map(([tema, data]) => ({
        tema,
        total: data.total,
        withRef: data.withRef,
        percentage: Math.round(data.withRef / data.total * 100)
      }))
      .sort((a, b) => a.percentage - b.percentage)

    themeStatsArray.forEach(({ tema, total, withRef, percentage }) => {
      const icon = percentage >= 70 ? '✅' : percentage >= 40 ? '⚠️' : '❌'
      console.log(`${icon} ${tema.substring(0, 40).padEnd(40)} ${withRef}/${total} (${percentage}%)`)
    })
    console.log('')

    // Mostrar muestra de preguntas sin referencia
    if (questionsWithoutRef.length > 0) {
      console.log('⚠️  PREGUNTAS SIN FUNDAMENTO LEGAL (primeras 10)')
      console.log('=' .repeat(60))
      questionsWithoutRef.slice(0, 10).forEach((q, i) => {
        console.log(`${i + 1}. [${q.tema}] ${q.text}`)
        console.log(`   ID: ${q.id}`)
        console.log('')
      })
    }

    // Verificar documentos legales disponibles
    const legalDocuments = await prisma.legalDocument.findMany({
      where: { active: true },
      select: {
        id: true,
        reference: true,
        title: true,
        documentType: true,
      }
    })

    console.log('📖 DOCUMENTOS LEGALES DISPONIBLES')
    console.log('=' .repeat(60))
    console.log(`Total de documentos activos: ${legalDocuments.length}`)
    console.log('')
    
    if (legalDocuments.length > 0) {
      const docsByType = new Map<string, number>()
      legalDocuments.forEach(doc => {
        docsByType.set(doc.documentType, (docsByType.get(doc.documentType) || 0) + 1)
      })

      console.log('Por tipo:')
      docsByType.forEach((count, type) => {
        console.log(`  - ${type}: ${count}`)
      })
      console.log('')

      console.log('Ejemplos de documentos:')
      legalDocuments.slice(0, 5).forEach(doc => {
        console.log(`  - [${doc.documentType}] ${doc.reference || doc.title}`)
      })
    } else {
      console.log('⚠️  No hay documentos legales en la base de datos.')
      console.log('   Para mejorar los fundamentos legales, ejecuta:')
      console.log('   npx tsx scripts/load-legal-documents.ts')
    }

    console.log('')
    console.log('✨ Verificación completada')
    console.log('')

    // Recomendaciones
    console.log('💡 RECOMENDACIONES')
    console.log('=' .repeat(60))
    
    if (stats.withoutLegalReference > questions.length * 0.5) {
      console.log('❌ Más del 50% de preguntas sin fundamento legal.')
      console.log('   1. Revisa las explicaciones de las preguntas')
      console.log('   2. Añade referencias legales en formato estándar')
      console.log('   3. Carga documentos legales en la base de datos')
    } else if (stats.withoutLegalReference > questions.length * 0.3) {
      console.log('⚠️  Entre 30-50% de preguntas sin fundamento legal.')
      console.log('   1. Mejora las explicaciones de preguntas sin referencia')
      console.log('   2. Carga más documentos legales relacionados')
    } else {
      console.log('✅ Buena cobertura de fundamentos legales.')
      console.log('   Continúa mejorando las preguntas sin referencia.')
    }

    if (legalDocuments.length < 10) {
      console.log('')
      console.log('⚠️  Pocos documentos legales en la base de datos.')
      console.log('   Carga más documentos para mejorar la búsqueda automática.')
    }

    console.log('')

  } catch (error) {
    console.error('❌ Error al verificar fundamentos legales:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar verificación
verifyLegalFoundations()
  .then(() => {
    console.log('✅ Proceso completado exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
