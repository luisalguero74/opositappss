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

async function validateQuestionWithAI(question: any): Promise<ValidationResult> {
  try {
    // Buscar documentos legales relevantes
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
      take: 50
    })

    const prompt = `Eres un experto en Derecho Administrativo, Constitucional y de la Seguridad Social con amplia experiencia en oposiciones.

TAREA: Analiza esta pregunta de test y valídala profesionalmente.

PREGUNTA:
${question.text}

OPCIONES:
${question.options}

RESPUESTA CORRECTA: ${question.correctAnswer}

EXPLICACIÓN ACTUAL:
${question.explanation || 'No hay explicación'}

CONTEXTO LEGAL DISPONIBLE:
${legalDocs.slice(0, 5).map(doc => `- ${doc.title}: ${doc.content.substring(0, 500)}...`).join('\n')}

INSTRUCCIONES DE VALIDACIÓN:

1. ANALIZA LA CALIDAD DE LA PREGUNTA (0-100):
   - ¿Está bien redactada y es clara?
   - ¿Es relevante para oposiciones de Seguridad Social?
   - ¿Tiene la complejidad adecuada?

2. ANALIZA LAS RESPUESTAS (0-100):
   - ¿La respuesta correcta ES realmente correcta según la ley?
   - ¿Las incorrectas son plausibles pero falsas?
   - ¿Están bien balanceadas?

3. ANALIZA LA EXPLICACIÓN (0-100):
   - ¿Cita artículos y leyes específicos?
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
  "aiReport": "Informe detallado de la validación...",
  "verified": true,
  "errors": ["error1 si hay", "error2 si hay"]
}`

    const groq = await getGroqClient()
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })

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
    const { questionIds, autoApplyImprovements = true, threshold = 85 } = body

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

    // Procesar cada pregunta
    for (const question of questions) {
      console.log(`📝 Validando pregunta ${question.id}...`)
      
      const result = await validateQuestionWithAI(question)
      results.push(result)

      // SIEMPRE actualizar la base de datos con el resultado
      const updateData: any = {
        aiReviewed: true // Marcar que la IA la ha revisado
      }
      
      // Aplicar mejoras solo si están autorizadas y la puntuación es suficiente
      if (autoApplyImprovements && result.scores.overall >= threshold) {
        if (result.improvements.questionText) {
          updateData.text = result.improvements.questionText
        }
        
        if (result.improvements.options) {
          updateData.options = result.improvements.options
        }
        
        if (result.improvements.explanation) {
          updateData.explanation = result.improvements.explanation
        }

        // Contar mejoras aplicadas
        if (result.improvements.questionText || result.improvements.options || result.improvements.explanation) {
          improved++
        }
      }

      // SIEMPRE actualizar estado según decisión de la IA
      if (result.decision === 'VALIDATED') {
        updateData.reviewStatus = 'VALIDATED'
        validated++
      } else if (result.decision === 'NEEDS_REVIEW') {
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

    return NextResponse.json({
      success: true,
      summary: {
        total: questions.length,
        validated,
        needsReview,
        quarantined,
        improved
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
