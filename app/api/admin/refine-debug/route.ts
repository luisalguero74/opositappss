import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import Groq from 'groq-sdk'

export async function POST(request: Request) {
  try {
    const { questionIds } = await request.json()
    
    console.log('[Refine Debug] Iniciando con IDs:', questionIds)
    
    // 1. Verificar API keys
    const openaiKey = process.env.OPENAI_API_KEY
    const groqKey = process.env.GROQ_API_KEY
    
    console.log('[Refine Debug] OpenAI Key:', openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NO CONFIGURADA')
    console.log('[Refine Debug] Groq Key:', groqKey ? `${groqKey.substring(0, 10)}...` : 'NO CONFIGURADA')
    
    if (!openaiKey || !groqKey) {
      return NextResponse.json({ 
        error: 'API keys no configuradas',
        hasOpenAI: !!openaiKey,
        hasGroq: !!groqKey
      }, { status: 500 })
    }
    
    // 2. Inicializar clientes
    console.log('[Refine Debug] Inicializando clientes...')
    const openai = new OpenAI({ apiKey: openaiKey })
    const groq = new Groq({ apiKey: groqKey })
    console.log('[Refine Debug] Clientes inicializados correctamente')
    
    // 3. Obtener preguntas
    console.log('[Refine Debug] Buscando preguntas en BD...')
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        reviewStatus: true
      }
    })
    
    console.log('[Refine Debug] Preguntas encontradas:', questions.length)
    
    if (questions.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron preguntas',
        searchedIds: questionIds
      }, { status: 404 })
    }
    
    // 4. Probar con UNA pregunta para simplificar
    const testQuestion = questions[0]
    console.log('[Refine Debug] Probando con pregunta:', testQuestion.id)
    console.log('[Refine Debug] Texto:', testQuestion.text.substring(0, 100) + '...')
    
    // 5. Obtener 10 documentos legales (simplificado)
    console.log('[Refine Debug] Obteniendo documentos legales...')
    const legalDocs = await prisma.legalDocument.findMany({
      select: { title: true, content: true },
      where: { active: true },
      take: 10
    })
    console.log('[Refine Debug] Documentos legales obtenidos:', legalDocs.length)
    
    // 6. Crear prompt MUY SIMPLE
    const simplePrompt = `Eres un experto en oposiciones de Seguridad Social.

PREGUNTA ORIGINAL:
${testQuestion.text}

OPCIONES:
${typeof testQuestion.options === 'string' ? testQuestion.options : JSON.stringify(testQuestion.options)}

RESPUESTA CORRECTA: ${testQuestion.correctAnswer}

EXPLICACIÓN ACTUAL:
${testQuestion.explanation || 'Sin explicación'}

DOCUMENTACIÓN LEGAL (primeros 3):
${legalDocs.slice(0, 3).map(doc => `- ${doc.title}: ${doc.content?.substring(0, 200) || ''}`).join('\n')}

TAREA:
Mejora esta pregunta de oposición para que sea de nivel profesional. Asegúrate de:
1. Citar artículos legales específicos con BOE si es posible
2. Hacer las opciones más técnicas y profesionales  
3. Mejorar la explicación con fundamento legal

Responde SOLO con un JSON válido con esta estructura:
{
  "improvedText": "Pregunta mejorada aquí",
  "improvedOptions": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "improvedExplanation": "Explicación mejorada con fundamentos legales",
  "changesApplied": "Resumen de cambios",
  "estimatedScore": 85
}`

    console.log('[Refine Debug] Prompt creado (longitud:', simplePrompt.length, 'caracteres)')
    
    // 7. Llamar a OpenAI
    console.log('[Refine Debug] Llamando a OpenAI GPT-4o...')
    const startTime = Date.now()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Eres un experto en crear preguntas de oposiciones. Respondes con JSON.' },
        { role: 'user', content: simplePrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 2000
    })
    
    const elapsed = Date.now() - startTime
    console.log('[Refine Debug] Respuesta recibida en', elapsed, 'ms')
    
    const content = response.choices[0].message.content
    if (!content) {
      console.error('[Refine Debug] Sin contenido en respuesta')
      return NextResponse.json({ error: 'Sin contenido de OpenAI' }, { status: 500 })
    }
    
    console.log('[Refine Debug] Contenido recibido (longitud:', content.length, 'caracteres)')
    console.log('[Refine Debug] Primeros 200 caracteres:', content.substring(0, 200))
    
    // 8. Parsear JSON
    const refined = JSON.parse(content)
    console.log('[Refine Debug] JSON parseado correctamente')
    console.log('[Refine Debug] Campos:', Object.keys(refined))
    
    // 9. Validar con Llama (simplificado)
    console.log('[Refine Debug] Validando con Llama...')
    
    const validationPrompt = `Evalúa esta pregunta de oposición del 0 al 100:

PREGUNTA: ${refined.improvedText}

Responde SOLO con JSON:
{
  "score": 85,
  "feedback": "Análisis breve",
  "legalAccuracy": "✅ Correcta",
  "wouldPass": true
}`

    const validationResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Eres un evaluador de preguntas de oposiciones. Responde con JSON.' },
        { role: 'user', content: validationPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
    
    const validationContent = validationResponse.choices[0].message.content
    const validation = validationContent ? JSON.parse(validationContent) : { score: 0 }
    
    console.log('[Refine Debug] Validación completada. Score:', validation.score)
    
    // 10. Retornar resultado
    return NextResponse.json({
      success: true,
      message: 'Refinamiento de prueba completado',
      questionId: testQuestion.id,
      originalText: testQuestion.text.substring(0, 100) + '...',
      refinedText: refined.improvedText.substring(0, 100) + '...',
      estimatedScore: refined.estimatedScore,
      validationScore: validation.score,
      timing: {
        openai: elapsed,
        total: Date.now() - startTime
      },
      stats: {
        total: 1,
        validated: validation.score >= 90 ? 1 : 0,
        improved: validation.score >= 75 && validation.score < 90 ? 1 : 0,
        failed: validation.score < 75 ? 1 : 0
      }
    })
    
  } catch (error: any) {
    console.error('[Refine Debug] ERROR GLOBAL:', error)
    console.error('[Refine Debug] Error message:', error.message)
    console.error('[Refine Debug] Error code:', error.code)
    console.error('[Refine Debug] Error type:', error.type)
    console.error('[Refine Debug] Stack:', error.stack)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      type: error.type,
      stack: error.stack,
      details: String(error)
    }, { status: 500 })
  }
}
