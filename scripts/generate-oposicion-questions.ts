/**
 * Script para generar preguntas tipo oposición C1 Seguridad Social
 * Genera preguntas siguiendo el formato oficial de las oposiciones españolas
 */

import { prisma } from '../src/lib/prisma'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

interface GeneratedQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'facil' | 'media' | 'dificil'
  topic: string
}

/**
 * Prompt específico para generar preguntas tipo oposición C1 Seguridad Social
 */
function getOposicionPrompt(content: string, topic: string): string {
  return `Eres un experto en elaboración de exámenes de oposiciones para el Cuerpo de Administrativos C1 de la Seguridad Social en España.

CONTEXTO DEL TEMARIO:
${content.substring(0, 3000)}

TEMA: ${topic}

INSTRUCCIONES PARA GENERAR PREGUNTAS:

1. FORMATO OFICIAL DE OPOSICIONES:
   - Preguntas tipo test con 4 opciones (A, B, C, D)
   - Solo 1 respuesta correcta
   - Lenguaje formal y técnico propio de la Administración Pública
   - Sin ambigüedades

2. ESTILO DE PREGUNTAS DE OPOSICIÓN:
   - Comenzar con "Según...", "De acuerdo con...", "Conforme a..."
   - Referencia a normativa específica cuando proceda
   - Preguntas directas sobre artículos, definiciones, procedimientos
   - Evitar preguntas de opinión o interpretación subjetiva

3. CONTENIDO ESPECÍFICO SEGURIDAD SOCIAL:
   - Prestaciones (incapacidad, jubilación, desempleo, maternidad/paternidad)
   - Estructura organizativa del INSS, TGSS, ISM
   - Afiliación, altas, bajas y cotización
   - Régimen General y Regímenes Especiales
   - Normativa: LGSS, Reglamentos, Órdenes Ministeriales
   - Procedimiento administrativo aplicado a la SS

4. NIVEL DE DIFICULTAD:
   - 40% preguntas fáciles (definiciones, conceptos básicos)
   - 40% preguntas medias (aplicación de normas, plazos, requisitos)
   - 20% preguntas difíciles (casos complejos, excepciones, coordinación normativa)

5. DISTRACTORES (respuestas incorrectas):
   - Plausibles y relacionados con el tema
   - Errores típicos o conceptos similares
   - Datos correctos pero en contexto incorrecto

GENERA 5 PREGUNTAS siguiendo este formato JSON estricto:

{
  "questions": [
    {
      "question": "Pregunta completa tipo oposición",
      "options": [
        "Opción A",
        "Opción B",
        "Opción C",
        "Opción D"
      ],
      "correctAnswer": 0,
      "explanation": "Explicación técnica de por qué es correcta, citando artículo o normativa si procede",
      "difficulty": "facil|media|dificil",
      "topic": "${topic}"
    }
  ]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional.`
}

/**
 * Genera preguntas para un documento específico
 */
async function generateQuestionsForDocument(
  documentId: string,
  documentTitle: string,
  content: string,
  topic: string
): Promise<GeneratedQuestion[]> {
  try {
    console.log(`  🤖 Generando preguntas para: ${documentTitle}`)
    
    const prompt = getOposicionPrompt(content, topic)
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en oposiciones de la Administración Pública española, especializado en el Cuerpo de Administrativos C1 de la Seguridad Social.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta del modelo')
    }

    // Limpiar la respuesta para obtener solo el JSON
    let jsonResponse = response.trim()
    
    // Remover markdown code blocks si existen
    if (jsonResponse.startsWith('```json')) {
      jsonResponse = jsonResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonResponse.startsWith('```')) {
      jsonResponse = jsonResponse.replace(/```\n?/g, '')
    }
    
    const parsed = JSON.parse(jsonResponse)
    
    return parsed.questions || []
  } catch (error) {
    console.error(`  ❌ Error generando preguntas:`, error)
    return []
  }
}

/**
 * Guarda preguntas en la base de datos
 */
async function saveQuestions(
  questions: GeneratedQuestion[],
  documentId: string
): Promise<number> {
  let saved = 0
  
  for (const q of questions) {
    try {
      // Convertir el índice numérico a letra (0->A, 1->B, 2->C, 3->D)
      const correctAnswerLetter = String.fromCharCode(65 + q.correctAnswer)
      
      await prisma.generatedQuestion.create({
        data: {
          documentId,
          text: q.question,
          options: JSON.stringify(q.options),
          correctAnswer: correctAnswerLetter,
          explanation: q.explanation,
          difficulty: q.difficulty === 'facil' ? 'easy' : q.difficulty === 'media' ? 'medium' : 'hard',
          topic: q.topic,
          approved: false, // Requieren revisión manual
          reviewed: false
        }
      })
      saved++
    } catch (error) {
      console.error(`  ⚠️  Error guardando pregunta:`, error)
    }
  }
  
  return saved
}

/**
 * Función principal
 */
async function main() {
  console.log('🎓 Generando Preguntas Tipo Oposición C1 Seguridad Social')
  console.log('=========================================================\n')

  // Obtener documentos del temario específico (Seguridad Social)
  const documents = await prisma.legalDocument.findMany({
    where: {
      OR: [
        { documentType: 'temario_especifico' },
        { 
          documentType: 'temario_general',
          topic: {
            in: ['Tema 1', 'Tema 2', 'Tema 8', 'Tema 13', 'Tema 14'] // Temas relevantes del general
          }
        }
      ],
      active: true
    },
    orderBy: {
      topic: 'asc'
    }
  })

  console.log(`📚 Documentos encontrados: ${documents.length}\n`)

  let totalQuestions = 0
  let totalSaved = 0

  // Generar preguntas para cada documento
  for (const doc of documents) {
    console.log(`📄 Procesando: ${doc.topic || 'Sin tema'} - ${doc.title}`)
    
    // Limitar el contenido para no exceder tokens
    const contentPreview = doc.content.length > 8000 
      ? doc.content.substring(0, 8000) + '...'
      : doc.content
    
    const questions = await generateQuestionsForDocument(
      doc.id,
      doc.title,
      contentPreview,
      doc.topic || 'Sin especificar'
    )

    if (questions.length > 0) {
      const saved = await saveQuestions(questions, doc.id)
      totalQuestions += questions.length
      totalSaved += saved
      
      console.log(`  ✅ Generadas: ${questions.length} preguntas`)
      console.log(`  💾 Guardadas: ${saved} preguntas`)
      
      // Mostrar ejemplos
      if (questions.length > 0) {
        console.log(`  📝 Ejemplo:`)
        console.log(`     "${questions[0].question.substring(0, 80)}..."`)
      }
    } else {
      console.log(`  ⚠️  No se generaron preguntas`)
    }
    
    console.log('')
    
    // Pequeña pausa para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('=========================================================')
  console.log('📊 RESUMEN FINAL')
  console.log('=========================================================')
  console.log(`✅ Preguntas generadas: ${totalQuestions}`)
  console.log(`💾 Preguntas guardadas: ${totalSaved}`)
  console.log(`📚 Documentos procesados: ${documents.length}`)
  console.log('')
  console.log('🎯 Siguiente paso:')
  console.log('   1. Ve a: http://localhost:3000/admin/questions')
  console.log('   2. Revisa y aprueba las preguntas generadas')
  console.log('   3. Las preguntas aparecerán en los exámenes una vez aprobadas')
  console.log('')
}

// Ejecutar
main()
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
