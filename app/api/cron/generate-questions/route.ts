import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

// Configuración para Vercel Cron
export const maxDuration = 300 // 5 minutos máximo
export const dynamic = 'force-dynamic'

// Función de reintento con fetch directo (igual que en generate-bulk-questions)
async function callGroqWithRetry(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  model: string,
  temperature: number,
  max_tokens: number,
  maxAttempts = 3
) {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Cron Groq Attempt ${attempt}/${maxAttempts}]`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          temperature,
          max_tokens,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Groq API error ${response.status}`)
      }

      return await response.json()
      
    } catch (error: any) {
      console.error(`[Cron Attempt ${attempt}] Error:`, error.message)
      
      if (attempt === maxAttempts) {
        throw error
      }
      
      const waitTime = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  throw new Error('Max retries exceeded')
}

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

async function generarPreguntasParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico',
  numPreguntas: number = 10
): Promise<PreguntaGenerada[]> {
  
  const prompt = `Eres un experto en crear preguntas de oposiciones. Genera ${numPreguntas} preguntas tipo test sobre:

Tema ${temaNumero}: ${temaTitulo}
Descripción: ${temaDescripcion}
Categoría: ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}

Requisitos:
- Preguntas profesionales basadas en normativa oficial
- 4 opciones por pregunta
- Explicaciones detalladas con referencias legales
- Distribución: 40% fácil, 40% media, 20% difícil

Formato JSON:
[{
  "pregunta": "Texto de la pregunta",
  "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "respuestaCorrecta": 0,
  "explicacion": "Explicación detallada con referencias",
  "dificultad": "media"
}]`

  try {
    const completion = await callGroqWithRetry(
      [
        { role: 'system', content: 'Eres un experto en oposiciones. Respondes SOLO en JSON válido.' },
        { role: 'user', content: prompt }
      ],
      'llama-3.3-70b-versatile',
      0.7,
      4000
    )

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const preguntas = JSON.parse(jsonMatch[0]) as PreguntaGenerada[]
    return preguntas.filter(p => p.pregunta && p.opciones?.length === 4)
    
  } catch (error) {
    console.error(`Error generando preguntas para tema ${temaNumero}:`, error)
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación por token secreto
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET no configurado')
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Cron] Token inválido')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('[Cron] ✓ Autenticación exitosa')

    // Verificar Groq API Key
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
    }

    // Obtener estadísticas de preguntas por tema
    const temasConPreguntas = await prisma.question.groupBy({
      by: ['temaCodigo'],
      _count: true
    })

    const estadisticas = new Map(
      temasConPreguntas.map(t => [t.temaCodigo?.toLowerCase(), (t as any)._count])
    )

    // Seleccionar temas con menos preguntas (máximo 5 por ejecución)
    const temasPendientes = TEMARIO_OFICIAL
      .filter(t => {
        const count = estadisticas.get(t.id.toLowerCase()) || 0
        return count < 100 // Generar hasta tener 100 preguntas por tema
      })
      .sort((a, b) => {
        const countA = estadisticas.get(a.id.toLowerCase()) || 0
        const countB = estadisticas.get(b.id.toLowerCase()) || 0
        return countA - countB // Priorizar temas con menos preguntas
      })
      .slice(0, 5) // Máximo 5 temas por ejecución

    if (temasPendientes.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Todos los temas tienen suficientes preguntas',
        temasConPreguntas: temasConPreguntas.length
      })
    }

    console.log(`[Cron] Generando preguntas para ${temasPendientes.length} temas`)

    let totalGeneradas = 0
    const resultados = []

    for (const tema of temasPendientes) {
      console.log(`[Cron] Procesando: Tema ${tema.numero} - ${tema.titulo}`)
      
      const preguntas = await generarPreguntasParaTema(
        tema.id,
        tema.numero,
        tema.titulo,
        tema.descripcion,
        tema.categoria,
        10 // 10 preguntas por tema
      )

      if (preguntas.length > 0) {
        // Crear cuestionario para estas preguntas
        const questionnaire = await prisma.questionnaire.create({
          data: {
            title: `${tema.categoria === 'general' ? 'General' : 'Específico'} - Tema ${tema.numero} (Cron ${new Date().toLocaleDateString()})`,
            type: 'theory',
            published: false // No publicar automáticamente
          }
        })

        // Insertar preguntas
        for (const p of preguntas) {
          await prisma.question.create({
            data: {
              questionnaireId: questionnaire.id,
              text: p.pregunta,
              options: JSON.stringify(p.opciones),
              correctAnswer: String.fromCharCode(97 + p.respuestaCorrecta),
              explanation: p.explicacion,
              difficulty: p.dificultad,
              temaCodigo: tema.id.toUpperCase(),
              temaNumero: tema.numero,
              temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
              temaTitulo: tema.titulo
            }
          })
        }

        totalGeneradas += preguntas.length
        resultados.push({
          tema: `${tema.numero} - ${tema.titulo}`,
          preguntas: preguntas.length
        })

        console.log(`[Cron] ✓ Creadas ${preguntas.length} preguntas para tema ${tema.numero}`)
      }

      // Pequeña pausa entre temas
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return NextResponse.json({
      success: true,
      message: `Generación automática completada`,
      totalPreguntas: totalGeneradas,
      temasProcesados: temasPendientes.length,
      detalles: resultados
    })

  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json({ 
      error: 'Error en generación automática',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
