// Sistema Dual de Refinamiento a Excelencia
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import OpenAI from 'openai'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

let openaiClient: OpenAI | null = null

function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

interface QuestionToRefine {
  id: string
  text: string
  options: any
  correctAnswer: string
  explanation: string | null
  reviewStatus: string
  temaCodigo: string | null
  temaTitulo: string | null
}

interface RefinementResult {
  success: boolean
  questionId: string
  originalStatus: string
  newScore: number
  improvedText?: string
  improvedOptions?: any
  improvedExplanation?: string
  finalStatus: 'VALIDATED' | 'PENDING' | 'QUARANTINED'
  feedback: string
}

// Obtener contexto legal según severidad
async function getLegalContext(reviewStatus: string): Promise<any[]> {
  let limit = 50
  if (reviewStatus === 'QUARANTINED') limit = 150
  else if (reviewStatus === 'PENDING') limit = 80

  const documents = await prisma.legalDocument.findMany({
    select: {
      title: true,
      content: true,
    },
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return documents
}

// Determinar estrategia según estado
function getStrategy(reviewStatus: string): 'deep' | 'moderate' | 'light' {
  if (reviewStatus === 'QUARANTINED') return 'deep'
  if (reviewStatus === 'PENDING') return 'moderate'
  return 'light'
}

// Prompt personalizado según estrategia
function getRefinementPrompt(question: QuestionToRefine, legalContext: any[], strategy: string): string {
  const contextText = legalContext
    .map(doc => `${doc.title}: ${doc.content?.substring(0, 400) || ''}`)
    .join('\n\n')

  let instructions = ''
  
  if (strategy === 'deep') {
    instructions = `REESCRITURA PROFUNDA - Esta pregunta está en CUARENTENA y necesita trabajo significativo.

OBJETIVO: Transformar en pregunta de EXCELENCIA (90+/100)

ACCIONES REQUERIDAS:
1. ENUNCIADO: Reescribir completamente si es necesario. Debe ser claro, preciso, sin ambigüedades
2. OPCIONES: Crear 4 opciones de calidad profesional:
   - UNA correcta (inequívoca según normativa)
   - TRES incorrectas (plausibles pero claramente erróneas)
   - Longitud similar, sin pistas obvias
3. EXPLICACIÓN: Nivel profesional (150-250 palabras):
   - Fundamento legal: "Según Art. X de la Ley Y (BOE fecha)"
   - Por qué la correcta es correcta
   - Por qué las incorrectas son incorrectas
   - Contexto normativo relevante

VERIFICAR:
- ¿Una sola respuesta correcta inequívoca?
- ¿Distractores de calidad?
- ¿Explicación convincente para tribunal de oposiciones?`
  } else if (strategy === 'moderate') {
    instructions = `MEJORA MODERADA - Pregunta PENDIENTE que necesita refinamiento.

OBJETIVO: Elevar a EXCELENCIA (90+/100)

ACCIONES:
1. ENUNCIADO: Mejorar claridad y precisión técnica
2. OPCIONES: Optimizar distractores (incorrectas plausibles pero erróneas)
3. EXPLICACIÓN: Ampliar con:
   - Cita legal específica (Art. X Ley Y)
   - Contexto normativo
   - Razonamiento claro
   - 100-200 palabras

MANTENER: El concepto y estructura base (solo mejorar)
VERIFICAR: Precisión legal absoluta`
  } else {
    instructions = `AJUSTES FINALES - Pregunta VALIDADA que puede perfeccionarse.

OBJETIVO: Perfección absoluta (95+/100)

ACCIONES MÍNIMAS:
1. Precisión legal total en explicación
2. Citas exactas de artículos
3. Eliminar cualquier ambigüedad residual
4. Lenguaje formal impecable

NO CAMBIAR: Estructura ni esencia de la pregunta`
  }

  return `Eres un experto en oposiciones de Seguridad Social con 20 años de experiencia.

PREGUNTA ACTUAL (Estado: ${question.reviewStatus}):
Tema: ${question.temaCodigo || 'N/A'} - ${question.temaTitulo || 'N/A'}

Texto: ${question.text}

Opciones: ${typeof question.options === 'string' ? question.options : JSON.stringify(question.options)}

Respuesta correcta: ${question.correctAnswer}

Explicación actual: ${question.explanation || 'Sin explicación'}

${instructions}

CONTEXTO LEGAL DISPONIBLE:
${contextText.substring(0, 3000)}

FORMATO DE RESPUESTA (JSON estricto):
{
  "improvedText": "Enunciado mejorado/reescrito",
  "improvedOptions": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "A|B|C|D",
  "improvedExplanation": "Explicación completa con fundamento legal...",
  "changesApplied": "Descripción breve de mejoras aplicadas",
  "estimatedScore": 92
}

Responde SOLO con JSON válido, sin texto adicional.`
}

// Refinar con GPT-4o
async function refineWithGPT(
  question: QuestionToRefine,
  legalContext: any[],
  strategy: string
): Promise<any> {
  const openai = getOpenAIClient()
  if (!openai) throw new Error('OpenAI no disponible')

  const prompt = getRefinementPrompt(question, legalContext, strategy)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Eres un experto en crear preguntas de oposiciones de excelencia. Respondes siempre con JSON válido.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('Sin respuesta de GPT')

  return JSON.parse(content)
}

// Validar con Llama
async function validateWithLlama(improvedData: any, originalQuestion: QuestionToRefine): Promise<number> {
  const legalDocs = await prisma.legalDocument.findMany({
    select: { title: true, content: true },
    where: { active: true },
    take: 20,
  })

  const contextText = legalDocs
    .map(doc => `${doc.title}: ${doc.content?.substring(0, 200) || ''}`)
    .join('\n')

  const prompt = `Evalúa esta pregunta de oposición de Seguridad Social del 0 al 100.

PREGUNTA:
${improvedData.improvedText}

OPCIONES:
${Array.isArray(improvedData.improvedOptions) 
  ? improvedData.improvedOptions.join('\n') 
  : improvedData.improvedOptions}

RESPUESTA CORRECTA: ${improvedData.correctAnswer}

EXPLICACIÓN:
${improvedData.improvedExplanation}

CONTEXTO LEGAL:
${contextText}

CRITERIOS (0-100):
- Claridad del enunciado (25 pts)
- Calidad de distractores (25 pts)
- Fundamento legal explicación (25 pts)
- Precisión técnica (25 pts)

RESPONDE SOLO JSON:
{
  "score": 88,
  "feedback": "Análisis breve"
}`

  const response = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Eres evaluador experto. Responde con JSON.' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) return 0

  const result = JSON.parse(content)
  return result.score || 0
}

// Proceso completo de refinamiento
async function refineQuestion(question: QuestionToRefine): Promise<RefinementResult> {
  const strategy = getStrategy(question.reviewStatus)
  
  console.log(`[Refine] ${question.id}: ${question.reviewStatus} → Estrategia: ${strategy}`)

  try {
    // Obtener contexto legal
    const legalContext = await getLegalContext(question.reviewStatus)

    // Refinar con GPT-4o
    const refinement = await refineWithGPT(question, legalContext, strategy)

    // Validar con Llama
    const score = await validateWithLlama(refinement, question)

    console.log(`[Refine] Score obtenido: ${score}`)

    // Determinar estado final
    let finalStatus: 'VALIDATED' | 'PENDING' | 'QUARANTINED'
    if (score >= 90) finalStatus = 'VALIDATED'
    else if (score >= 75) finalStatus = 'PENDING'
    else finalStatus = 'QUARANTINED'

    return {
      success: true,
      questionId: question.id,
      originalStatus: question.reviewStatus,
      newScore: score,
      improvedText: refinement.improvedText,
      improvedOptions: refinement.improvedOptions,
      improvedExplanation: refinement.improvedExplanation,
      finalStatus,
      feedback: refinement.changesApplied || 'Refinamiento aplicado'
    }

  } catch (error) {
    console.error(`[Refine] Error en ${question.id}:`, error)
    return {
      success: false,
      questionId: question.id,
      originalStatus: question.reviewStatus,
      newScore: 0,
      finalStatus: 'QUARANTINED',
      feedback: `Error: ${error instanceof Error ? error.message : 'Unknown'}`
    }
  }
}

// Endpoint principal
export async function POST(request: Request) {
  try {
    const { questionIds, targetStatus } = await request.json()

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'questionIds requerido (array)' },
        { status: 400 }
      )
    }

    // Filtrar por estado si se especifica
    const whereClause: any = {
      id: { in: questionIds },
      aiReviewed: true
    }

    if (targetStatus) {
      whereClause.reviewStatus = targetStatus
    } else {
      // Por defecto, solo PENDING y QUARANTINED
      whereClause.reviewStatus = { in: ['PENDING', 'QUARANTINED'] }
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        reviewStatus: true,
        temaCodigo: true,
        temaTitulo: true,
      }
    })

    if (questions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay preguntas para refinar',
        stats: { total: 0, validated: 0, improved: 0, failed: 0 }
      })
    }

    console.log(`[Refine] Procesando ${questions.length} preguntas...`)

    const results: RefinementResult[] = []
    let validated = 0
    let improved = 0
    let failed = 0

    // Procesar cada pregunta
    for (const q of questions) {
      const questionToRefine: QuestionToRefine = {
        id: q.id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        reviewStatus: q.reviewStatus,
        temaCodigo: q.temaCodigo,
        temaTitulo: q.temaTitulo,
      }

      const result = await refineQuestion(questionToRefine)
      results.push(result)

      // Guardar en BD si hubo mejora
      if (result.success && result.newScore >= 75) {
        const updateData: any = {}

        // Si alcanzó excelencia (≥90), guardar todo
        if (result.newScore >= 90) {
          updateData.text = result.improvedText
          updateData.options = result.improvedOptions
          updateData.explanation = result.improvedExplanation
          updateData.reviewStatus = 'VALIDATED'
          validated++
        } 
        // Si mejoró pero no a excelencia (75-89), guardar y dejar en PENDING
        else if (result.newScore >= 75) {
          updateData.text = result.improvedText
          updateData.options = result.improvedOptions
          updateData.explanation = result.improvedExplanation
          updateData.reviewStatus = 'PENDING'
          improved++
        }

        await prisma.question.update({
          where: { id: q.id },
          data: updateData
        })

        console.log(`[Refine] ✅ ${q.id}: ${q.reviewStatus} → ${result.finalStatus} (${result.newScore})`)
      } else {
        failed++
        console.log(`[Refine] ❌ ${q.id}: Falló refinamiento`)
      }

      // Pausa para no saturar APIs
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    const stats = {
      total: results.length,
      validated,
      improved,
      failed,
      averageScore: results.reduce((sum, r) => sum + r.newScore, 0) / results.length
    }

    console.log(`[Refine] Completado:`, stats)

    return NextResponse.json({
      success: true,
      stats,
      results
    })

  } catch (error) {
    console.error('[Refine] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error en refinamiento',
        details: error instanceof Error ? error.message : 'Unknown'
      },
      { status: 500 }
    )
  }
}
