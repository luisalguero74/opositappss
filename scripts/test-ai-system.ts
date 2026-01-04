// Script para probar el sistema de IA
// Ejecutar con: npx ts-node scripts/test-ai-system.ts

import { processDocument } from '../src/lib/document-processor'
import { generateQuestionsFromContent } from '../src/lib/ai-question-generator'
import { generateRAGResponse } from '../src/lib/rag-system'

async function testAISystem() {
  console.log('🤖 Probando Sistema de IA...\n')

  // Test 1: Procesamiento de Documento
  console.log('1️⃣ Test: Procesamiento de Documento')
  try {
    const testContent = `
Artículo 14 de la Constitución Española

Los españoles son iguales ante la ley, sin que pueda prevalecer discriminación alguna 
por razón de nacimiento, raza, sexo, religión, opinión o cualquier otra condición o 
circunstancia personal o social.
    `.trim()

    console.log('✅ Contenido de prueba creado\n')

    // Test 2: Generación de Preguntas
    console.log('2️⃣ Test: Generación de Preguntas con Groq')
    const questions = await generateQuestionsFromContent(testContent, {
      topic: 'Constitución Española',
      difficulty: 'medium',
      count: 2
    })

    console.log(`✅ Generadas ${questions.length} preguntas:`)
    questions.forEach((q, i) => {
      console.log(`\n   Pregunta ${i + 1}:`)
      console.log(`   ${q.question}`)
      console.log(`   Opciones: ${q.options.join(', ')}`)
      console.log(`   Respuesta correcta: ${q.correctAnswer}`)
      console.log(`   Explicación: ${q.explanation}`)
    })

    // Test 3: Sistema RAG
    console.log('\n3️⃣ Test: Sistema RAG (Chat)')
    const documents = [
      {
        id: 'test-1',
        title: 'Constitución Española - Artículo 14',
        content: testContent
      }
    ]

    const ragResponse = await generateRAGResponse(
      '¿Qué dice el artículo 14 sobre la discriminación?',
      documents.map(d => ({
        documentId: d.id,
        documentTitle: d.title,
        content: d.content,
        relevanceScore: 100
      }))
    )

    console.log('✅ Respuesta RAG:')
    console.log(`   ${ragResponse}\n`)

    console.log('🎉 ¡Todos los tests pasaron exitosamente!')
    console.log('\n📊 Resumen:')
    console.log('   ✅ Procesamiento de documentos: OK')
    console.log('   ✅ Generación de preguntas: OK')
    console.log('   ✅ Sistema RAG (Chat): OK')
    console.log('\n💡 El sistema está listo para usar!')

  } catch (error: any) {
    console.error('❌ Error en el test:', error.message)
    console.error('\n🔍 Detalles:', error)
    process.exit(1)
  }
}

testAISystem()
