import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ValidationScore {
  questionQuality: number
  answersQuality: number
  explanationQuality: number
  legalAccuracy: number
  overall: number
}

interface ValidationResult {
  questionId: string
  decision: 'VALIDATED' | 'NEEDS_REVIEW' | 'QUARANTINED'
  scores: ValidationScore
  improvements: {
    questionText?: string
    options?: string
    explanation?: string
    legalReferences?: string[]
  }
  aiReport: string
  verified: boolean
  errors?: string[]
}

async function getGroqClient() {
  const Groq = (await import('groq-sdk')).default
  return new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
}

async function getOpenAIClient() {
  const OpenAI = (await import('openai')).default
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
}

async function validateQuestionWithAI(question: any, useAdvancedModel: boolean = false): Promise<ValidationResult> {
  try {
    // Buscar documentos legales relevantes - USAR MÁS para mejor contexto
    const legalDocs = await prisma.legalDocument.findMany({
      where: {
        OR: [
          { documentType: 'ley' },
          { documentType: 'temario_general' },
          { documentType: 'temario_especifico' }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        documentType: true
      },
      take: useAdvancedModel ? 100 : 20 // Más contexto para GPT-4o
    })

    const prompt = `Eres un tribunal calificador experto en oposiciones para la Administración de la Seguridad Social, con profundo conocimiento de Derecho Administrativo, Constitucional y de la Seguridad Social.

TAREA: Analiza esta pregunta con MÁXIMA RIGUROSIDAD y propón mejoras para alcanzar EXCELENCIA PROFESIONAL.

PREGUNTA:
${question.text}

OPCIONES:
${question.options}

RESPUESTA CORRECTA: ${question.correctAnswer}

EXPLICACIÓN ACTUAL:
${question.explanation || 'No hay explicación'}

CONTEXTO LEGAL DISPONIBLE:
${legalDocs.slice(0, useAdvancedModel ? 50 : 10).map(doc => `- ${doc.title}: ${doc.content.substring(0, 800)}...`).join('\n')}

CRITERIOS DE EXCELENCIA (puntúa 0-100 cada uno):

1. CALIDAD DE LA PREGUNTA:
   - Redacción impecable, sin ambigüedades
   - Relevancia directa para oposiciones TGSS
   - Complejidad apropiada (ni trivial ni excesiva)
   - Técnica de test profesional

2. CALIDAD DE LAS RESPUESTAS:
   - Respuesta correcta 100% verificable legalmente
   - Distractores plausibles pero claramente incorrectos
   - Balance perfecto de dificultad
   - Sin trampas ni trucos

3. CALIDAD DE LA EXPLICACIÓN:
   - Referencias legales EXACTAS (artículo, ley, fecha)
   - Texto legal literal cuando sea relevante
   - Explicación pedagógica clara
   - Justificación de por qué las incorrectas lo son

4. PRECISIÓN LEGAL:
   - Verificación contra normativa vigente
   - Sin errores en artículos citados
   - Actualizada a ${new Date().getFullYear()}
   - Sin contradicciones legales

MEJORAS OBLIGATORIAS si puntuación < 90:
- Reescribe la pregunta para máxima claridad
- Mejora las opciones para mayor precisión
- ENRIQUECE la explicación con:
  * Artículo exacto citado LITERALMENTE
  * Ley completa (nombre, número, año)
  * Contexto legal relevante
  * Por qué cada opción incorrecta lo es

DECISIÓN FINAL:
- VALIDATED: Solo si puntuación global ≥ 90 y sin errores
- NEEDS_REVIEW: Si 75-89 o requiere verificación manual
- QUARANTINED: Si < 75 o tiene errores graves

RESPONDE EN JSON ESTRICTO:
   - ¿Es clara y educativa?
   - ¿Tiene texto legal literal o parafraseado?

4. PRECISIÓN LEGAL (0-100):
   - ¿Todo es 100% correcto legalmente?
   - ¿Hay errores o imprecisiones?
   - ¿Están verificados los artículos citados?

5. MEJORAS PROPUESTAS:
   Si encuentras problemas, propón:
   - Nuevo texto de pregunta (si es necesario)
   - Nuevas opciones (si es necesario)
   - Explicación mejorada con referencias legales LITERALES
   - Lista de artículos/leyes verificados

6. DECISIÓN FINAL:
   - VALIDATED: Si puntuación global ≥ 85 y sin errores legales
   - NEEDS_REVIEW: Si 70-84 o tiene dudas menores
   - QUARANTINED: Si < 70 o tiene errores graves

RESPONDE EN JSON con esta estructura EXACTA:
{
  "scores": {
    "questionQuality": 85,
    "answersQuality": 90,
    "explanationQuality": 75,
    "legalAccuracy": 95,
    "overall": 86
  },
  "decision": "VALIDATED",
  "improvements": {
    "questionText": "texto mejorado si aplica",
    "options": "opciones mejoradas si aplica (formato JSON string)",
    "explanation": "explicación enriquecida con referencias legales",
    "legalReferences": ["Art. 21 Ley 39/2015", "Art. 105 CE"]
  },
{
  "scores": {
    "questionQuality": 85,
    "answersQuality": 90,
    "explanationQuality": 75,
    "legalAccuracy": 95,
    "overall": 86
  },
  "decision": "VALIDATED",
  "improvements": {
    "questionText": "texto mejorado si aplica o null",
    "options": "opciones mejoradas si aplica o null",
    "explanation": "explicación ENRIQUECIDA con referencias legales LITERALES",
    "legalReferences": ["Art. 21 Ley 39/2015 de 1 de octubre", "Art. 105 CE"]
  },
  "aiReport": "Análisis detallado justificando puntuaciones y decisión",
  "verified": true,
  "errors": []
}`

    // SISTEMA HÍBRIDO: GPT-4o para preguntas complejas, Llama para simples
    let completion: any
    
    if (useAdvancedModel) {
      console.log('🔬 Usando GPT-4o para validación avanzada...')
      const openai = await getOpenAIClient()
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Eres un tribunal calificador experto en oposiciones de la Administración Pública española. Respondes SOLO con JSON válido.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    } else {
      console.log('⚡ Usando Llama 3.3 70B para validación rápida...')
      const groq = await getGroqClient()
      completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 3000,
        response_format: { type: 'json_object' }
      })
    }

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No se recibió respuesta de la IA')
    }

    const result = JSON.parse(response)

    return {
      questionId: question.id,
      decision: result.decision || 'NEEDS_REVIEW',
      scores: {
        questionQuality: result.scores?.questionQuality || 0,
        answersQuality: result.scores?.answersQuality || 0,
        explanationQuality: result.scores?.explanationQuality || 0,
        legalAccuracy: result.scores?.legalAccuracy || 0,
        overall: result.scores?.overall || 0
      },
      improvements: result.improvements || {},
      aiReport: result.aiReport || 'Sin informe',
      verified: result.verified || false,
      errors: result.errors || []
    }
  } catch (error) {
    console.error('Error validating question with AI:', error)
    return {
      questionId: question.id,
      decision: 'NEEDS_REVIEW',
      scores: {
        questionQuality: 0,
        answersQuality: 0,
        explanationQuality: 0,
        legalAccuracy: 0,
        overall: 0
      },
      improvements: {},
      aiReport: `Error en validación: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      verified: false,
      errors: [error instanceof Error ? error.message : 'Error desconocido']
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        error: 'GROQ_API_KEY no configurada',
        details: 'Configura la clave API de Groq en las variables de entorno'
      }, { status: 500 })
    }

    const body = await req.json()
    const { questionIds, autoApplyImprovements = true, threshold = 60 } = body

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json({ error: 'questionIds es requerido y debe ser un array' }, { status: 400 })
    }

    // Obtener preguntas a validar
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        reviewStatus: 'PENDING'
      },
      include: {
        questionnaire: true
      }
    })

    if (questions.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron preguntas pendientes con los IDs proporcionados'
      }, { status: 404 })
    }

    console.log(`🤖 Iniciando validación IA de ${questions.length} preguntas...`)

    const results: ValidationResult[] = []
    let validated = 0
    let needsReview = 0
    let quarantined = 0
    let improved = 0
    let usedAdvancedModel = 0

    // Procesar cada pregunta con SISTEMA HÍBRIDO
    for (const question of questions) {
      console.log(`📝 Validando pregunta ${question.id}...`)
      
      // PASADA 1: Validación rápida con Llama
      const quickResult = await validateQuestionWithAI(question, false)
      
      let finalResult = quickResult
      
      // Si puntuación < 80, usar GPT-4o para EXCELENCIA
      if (quickResult.scores.overall < 80) {
        console.log(`🔬 Pregunta ${question.id} necesita validación avanzada (score: ${quickResult.scores.overall})`)
        finalResult = await validateQuestionWithAI(question, true)
        usedAdvancedModel++
      }
      
      results.push(finalResult)

      // SIEMPRE actualizar la base de datos con el resultado
      const updateData: any = {
        aiReviewed: true // Marcar que la IA la ha revisado
      }
      
      // Aplicar mejoras solo si están autorizadas y la puntuación es suficiente
      if (autoApplyImprovements && finalResult.scores.overall >= threshold) {
        if (finalResult.improvements.questionText) {
          updateData.text = finalResult.improvements.questionText
        }
        
        if (finalResult.improvements.options) {
          updateData.options = finalResult.improvements.options
        }
        
        if (finalResult.improvements.explanation) {
          updateData.explanation = finalResult.improvements.explanation
        }

        // Contar mejoras aplicadas
        if (finalResult.improvements.questionText || finalResult.improvements.options || finalResult.improvements.explanation) {
          improved++
        }
      }

      // SIEMPRE actualizar estado según decisión de la IA
      if (finalResult.decision === 'VALIDATED') {
        updateData.reviewStatus = 'VALIDATED'
        validated++
      } else if (finalResult.decision === 'NEEDS_REVIEW') {
        updateData.reviewStatus = 'PENDING'
        needsReview++
      } else {
        updateData.reviewStatus = 'QUARANTINED'
        quarantined++
      }

      // Actualizar la pregunta en base de datos
      await prisma.question.update({
        where: { id: question.id },
        data: updateData
      })

      // Esperar un poco para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`✅ Validación completada:`)
    console.log(`   - Validadas: ${validated}`)
    console.log(`   - Necesitan revisión: ${needsReview}`)
    console.log(`   - En cuarentena: ${quarantined}`)
    console.log(`   - Mejoradas automáticamente: ${improved}`)
    console.log(`   - Validaciones avanzadas (GPT-4o): ${usedAdvancedModel}`)

    return NextResponse.json({
      success: true,
      summary: {
        total: questions.length,
        validated,
        needsReview,
        quarantined,
        improved,
        usedAdvancedModel
      },
      results,
      message: `Procesadas ${questions.length} preguntas. ${validated} validadas, ${improved} mejoradas automáticamente.`
    })

  } catch (error) {
    console.error('Error en validación IA:', error)
    return NextResponse.json({ 
      error: 'Error procesando validación',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
