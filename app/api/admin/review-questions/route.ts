import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ValidadorPreguntas } from '@/lib/validador-preguntas'
import { PROMPT_MEJORADO_LGSS, PROMPT_MEJORADO_TEMAGENERAL } from '@/lib/prompts-mejorados'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

interface PreguntaConProblemas {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  explanation: string | null
  difficulty: string
  temaCodigo: string | null
  temaNumero: number | null
  temaTitulo: string | null
  puntuacion: number
  errores: string[]
  advertencias: string[]
}

/**
 * GET: Analizar calidad de preguntas existentes
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const onlyProblems = searchParams.get('onlyProblems') === 'true'
    const minScore = parseInt(searchParams.get('minScore') || '0')
    const maxScore = parseInt(searchParams.get('maxScore') || '100')

    console.log(`\n📊 Iniciando análisis de calidad de preguntas...`)
    console.log(`   Límite: ${limit}, Offset: ${offset}, Solo problemas: ${onlyProblems}`)

    // Obtener preguntas de la base de datos
    const preguntas = await prisma.question.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        difficulty: true,
        temaCodigo: true,
        temaNumero: true,
        temaTitulo: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`   📚 Analizando ${preguntas.length} preguntas...`)

    // Validar cada pregunta
    const resultados: PreguntaConProblemas[] = []
    let totalValidas = 0
    let totalInvalidas = 0

    for (const pregunta of preguntas) {
      const opciones = typeof pregunta.options === 'string' 
        ? JSON.parse(pregunta.options) 
        : pregunta.options

      const correctAnswerIndex = ['A', 'B', 'C', 'D'].indexOf(pregunta.correctAnswer)

      const validacion = ValidadorPreguntas.validar({
        pregunta: pregunta.text,
        opciones: opciones,
        respuestaCorrecta: correctAnswerIndex,
        explicacion: pregunta.explanation || '',
        dificultad: pregunta.difficulty as 'facil' | 'media' | 'dificil'
      })

      if (validacion.valida) {
        totalValidas++
      } else {
        totalInvalidas++
      }

      // Filtrar según criterios
      if (onlyProblems && validacion.valida && validacion.puntuacion >= 60) {
        continue // Saltar preguntas válidas si solo queremos problemas
      }

      if (validacion.puntuacion < minScore || validacion.puntuacion > maxScore) {
        continue
      }

      resultados.push({
        id: pregunta.id,
        text: pregunta.text,
        options: opciones,
        correctAnswer: pregunta.correctAnswer,
        explanation: pregunta.explanation,
        difficulty: (pregunta.difficulty || 'media') as string,
        temaCodigo: pregunta.temaCodigo,
        temaNumero: pregunta.temaNumero,
        temaTitulo: pregunta.temaTitulo,
        puntuacion: validacion.puntuacion,
        errores: validacion.errores,
        advertencias: validacion.advertencias
      })
    }

    // Ordenar por puntuación (peores primero)
    resultados.sort((a, b) => a.puntuacion - b.puntuacion)

    // Estadísticas
    const estadisticas = {
      totalAnalizadas: preguntas.length,
      totalValidas,
      totalInvalidas,
      porcentajeValidas: Math.round((totalValidas / preguntas.length) * 100),
      promedioCalidad: Math.round(
        resultados.reduce((sum, r) => sum + r.puntuacion, 0) / resultados.length
      ),
      distribucionPorPuntuacion: {
        criticas: resultados.filter(r => r.puntuacion < 40).length,
        malas: resultados.filter(r => r.puntuacion >= 40 && r.puntuacion < 60).length,
        regulares: resultados.filter(r => r.puntuacion >= 60 && r.puntuacion < 80).length,
        buenas: resultados.filter(r => r.puntuacion >= 80).length
      }
    }

    console.log(`\n📊 RESULTADOS DEL ANÁLISIS:`)
    console.log(`   ✅ Válidas: ${totalValidas} (${estadisticas.porcentajeValidas}%)`)
    console.log(`   ❌ Inválidas: ${totalInvalidas}`)
    console.log(`   📈 Promedio de calidad: ${estadisticas.promedioCalidad}/100`)
    console.log(`   🔴 Críticas (<40): ${estadisticas.distribucionPorPuntuacion.criticas}`)
    console.log(`   🟠 Malas (40-59): ${estadisticas.distribucionPorPuntuacion.malas}`)
    console.log(`   🟡 Regulares (60-79): ${estadisticas.distribucionPorPuntuacion.regulares}`)
    console.log(`   🟢 Buenas (80+): ${estadisticas.distribucionPorPuntuacion.buenas}`)

    return NextResponse.json({
      success: true,
      estadisticas,
      preguntas: resultados,
      totalPreguntas: await prisma.question.count()
    })

  } catch (error: any) {
    console.error('❌ Error al analizar preguntas:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al analizar preguntas' 
    }, { status: 500 })
  }
}

/**
 * POST: Regenerar explicaciones/mejorar preguntas
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { 
      questionIds, 
      action = 'regenerate', // 'regenerate', 'fix', 'delete'
      batchSize = 10 
    } = body

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ 
        error: 'Se requiere array questionIds' 
      }, { status: 400 })
    }

    console.log(`\n🔧 Procesando ${questionIds.length} preguntas...`)
    console.log(`   Acción: ${action}`)

    const resultados = {
      procesadas: 0,
      exitosas: 0,
      fallidas: 0,
      errores: [] as string[]
    }

    if (action === 'delete') {
      // Eliminar preguntas
      const deleted = await prisma.question.deleteMany({
        where: {
          id: { in: questionIds }
        }
      })
      
      return NextResponse.json({
        success: true,
        message: `${deleted.count} preguntas eliminadas`,
        deleted: deleted.count
      })
    }

    // Procesar preguntas en lotes
    for (let i = 0; i < questionIds.length; i += batchSize) {
      const batch = questionIds.slice(i, i + batchSize)
      
      for (const questionId of batch) {
        resultados.procesadas++
        
        try {
          const pregunta = await prisma.question.findUnique({
            where: { id: questionId }
          })

          if (!pregunta) {
            resultados.fallidas++
            resultados.errores.push(`Pregunta ${questionId} no encontrada`)
            continue
          }

          // Regenerar explicación usando IA
          const nuevaExplicacion = await regenerarExplicacion(
            pregunta.text,
            typeof pregunta.options === 'string' ? JSON.parse(pregunta.options) : pregunta.options,
            ['A', 'B', 'C', 'D'].indexOf(pregunta.correctAnswer),
            pregunta.temaCodigo || 'GENERAL',
            pregunta.temaNumero || 0,
            pregunta.temaTitulo || 'Tema General'
          )

          // Actualizar en BD
          await prisma.question.update({
            where: { id: questionId },
            data: {
              explanation: nuevaExplicacion
            }
          })

          resultados.exitosas++
          console.log(`   ✅ Pregunta ${resultados.procesadas}/${questionIds.length} mejorada`)

        } catch (error: any) {
          resultados.fallidas++
          resultados.errores.push(`Error en ${questionId}: ${error.message}`)
          console.error(`   ❌ Error en pregunta ${questionId}:`, error.message)
        }

        // Pequeña pausa para no saturar
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    console.log(`\n✅ Proceso completado:`)
    console.log(`   Procesadas: ${resultados.procesadas}`)
    console.log(`   Exitosas: ${resultados.exitosas}`)
    console.log(`   Fallidas: ${resultados.fallidas}`)

    return NextResponse.json({
      success: true,
      ...resultados
    })

  } catch (error: any) {
    console.error('❌ Error al mejorar preguntas:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al mejorar preguntas' 
    }, { status: 500 })
  }
}

/**
 * Regenera la explicación de una pregunta usando IA
 */
async function regenerarExplicacion(
  pregunta: string,
  opciones: string[],
  respuestaCorrecta: number,
  temaCodigo: string,
  temaNumero: number,
  temaTitulo: string
): Promise<string> {
  
  const prompt = `Eres un experto en exámenes de oposiciones administrativas. 

PREGUNTA:
${pregunta}

OPCIONES:
${opciones.map((o, i) => `${['a)', 'b)', 'c)', 'd)'][i]} ${o}`).join('\n')}

RESPUESTA CORRECTA: ${['a)', 'b)', 'c)', 'd)'][respuestaCorrecta]}

TEMA: ${temaNumero} - ${temaTitulo} (${temaCodigo})

TAREA: Genera una EXPLICACIÓN EXHAUSTIVA siguiendo EXACTAMENTE este formato:

**FORMATO OBLIGATORIO:**
"[Artículo/Ley específica]: [Cita textual o paráfrasis precisa].

La opción ${['a)', 'b)', 'c)', 'd)'][respuestaCorrecta]} es correcta porque [explicación detallada con fundamento legal].

La opción ${['a)', 'b)', 'c)', 'd)'][respuestaCorrecta === 0 ? 1 : 0]} es incorrecta porque [razón específica con referencia legal si aplica].
La opción ${['a)', 'b)', 'c)', 'd)'][respuestaCorrecta <= 1 ? 2 : 1]} es incorrecta porque [razón específica].
La opción ${['a)', 'b)', 'c)', 'd)'][3]} es incorrecta porque [razón específica]."

REQUISITOS CRÍTICOS:
✅ SIEMPRE citar artículo/ley específica
✅ Explicar POR QUÉ la correcta es correcta
✅ Explicar POR QUÉ CADA incorrecta es incorrecta
✅ Usar lenguaje formal y profesional
✅ Mínimo 150 caracteres
✅ Si es LGSS: citar RDL 8/2015 con número de artículo exacto

❌ NO inventar artículos que no existen
❌ NO usar "probablemente" o datos aproximados

Responde SOLO con la explicación, sin introducción ni despedida.`

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Eres un experto jurídico en preparación de oposiciones. Generas explicaciones precisas y bien fundamentadas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const explicacion = data.choices[0]?.message?.content || ''

    // Validar que la explicación sea buena
    if (explicacion.length < 100) {
      throw new Error('Explicación demasiado corta')
    }

    return explicacion

  } catch (error: any) {
    console.error('Error regenerando explicación:', error)
    throw error
  }
}
