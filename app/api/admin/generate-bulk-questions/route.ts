import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'
import { logError } from '@/lib/error-logger'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
})

interface PreguntaGenerada {
  pregunta: string
  opciones: string[]
  respuestaCorrecta: number
  explicacion: string
  dificultad: 'facil' | 'media' | 'dificil'
}

// Función para calcular similitud entre textos (Jaccard Index)
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9áéíóúñü\s]/g, '').trim()
  const words1 = new Set(normalize(text1).split(/\s+/))
  const words2 = new Set(normalize(text2).split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  return union.size === 0 ? 0 : intersection.size / union.size
}

// Filtrar preguntas duplicadas o muy similares
function filtrarDuplicadosPorSimilaridad(
  preguntasNuevas: PreguntaGenerada[],
  preguntasExistentes: string[]
): PreguntaGenerada[] {
  const SIMILARITY_THRESHOLD = 0.7 // 70% de palabras en común = duplicado
  
  const resultado: PreguntaGenerada[] = []
  
  for (const pregunta of preguntasNuevas) {
    // Verificar duplicados exactos
    if (preguntasExistentes.some(existing => 
      existing.toLowerCase().trim() === pregunta.pregunta.toLowerCase().trim()
    )) {
      console.log(`      🚫 Duplicado exacto: ${pregunta.pregunta.substring(0, 60)}...`)
      continue
    }
    
    // Verificar preguntas muy similares con existentes
    const esSimilarAExistente = preguntasExistentes.some(existing => {
      const similarity = calculateSimilarity(existing, pregunta.pregunta)
      if (similarity >= SIMILARITY_THRESHOLD) {
        console.log(`      🚫 Similar ${Math.round(similarity * 100)}%: ${pregunta.pregunta.substring(0, 60)}...`)
        return true
      }
      return false
    })
    
    if (esSimilarAExistente) continue
    
    // Verificar duplicados dentro del mismo lote
    const esSimilarEnLote = resultado.some(existing => 
      calculateSimilarity(existing.pregunta, pregunta.pregunta) >= SIMILARITY_THRESHOLD
    )
    
    if (!esSimilarEnLote) {
      resultado.push(pregunta)
    } else {
      console.log(`      🚫 Duplicado en lote: ${pregunta.pregunta.substring(0, 60)}...`)
    }
  }
  
  return resultado
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { categoria, preguntasPorTema = 20 } = await req.json()

    if (!categoria || !['general', 'especifico', 'lgss'].includes(categoria)) {
      return NextResponse.json({ 
        error: 'Categoría inválida. Usa "general", "especifico" o "lgss"' 
      }, { status: 400 })
    }

    // Manejo especial para LGSS
    if (categoria === 'lgss') {
      console.log('\n⚖️ Iniciando generación de preguntas sobre LGSS RDL 8/2015...')
      
      // Crear cuestionario para LGSS
      const questionnaire = await prisma.questionnaire.create({
        data: {
          title: `LGSS (RDL 8/2015) - ${new Date().toLocaleDateString()}`,
          type: 'theory',
          published: false,
          statement: 'Preguntas sobre la Ley General de la Seguridad Social - Real Decreto Legislativo 8/2015'
        }
      })

      // Generar preguntas específicas sobre LGSS
      console.log('[POST] Llamando a generarPreguntasLGSS()...')
      const preguntasLGSS = await generarPreguntasLGSS(preguntasPorTema)
      
      console.log(`[POST] Respuesta de generarPreguntasLGSS: ${preguntasLGSS.length} preguntas`)
      
      if (preguntasLGSS.length === 0) {
        console.error('[POST] ❌ No se generaron preguntas sobre LGSS')
        return NextResponse.json({ 
          error: 'No se pudo generar preguntas sobre LGSS. Verifica que la API key de Groq esté configurada correctamente.' 
        }, { status: 500 })
      }

      // Guardar preguntas
      for (const p of preguntasLGSS) {
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: p.pregunta,
            options: JSON.stringify(p.opciones),
            correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta],
            explanation: p.explicacion,
            temaCodigo: 'LGSS',
            temaNumero: 0,
            temaParte: 'LGSS',
            temaTitulo: 'Ley General de la Seguridad Social (RDL 8/2015)',
            difficulty: p.dificultad
          }
        })
      }

      return NextResponse.json({
        message: 'Preguntas sobre LGSS generadas exitosamente',
        questionnaireId: questionnaire.id,
        temasProcesados: 1,
        preguntasGeneradas: preguntasLGSS.length,
        temasTotal: 1
      })
    }

    // Filtrar temas por categoría (para general/especifico)
    const temasFiltrados = TEMARIO_OFICIAL.filter(t => t.categoria === categoria)
    
    // Obtener estadísticas de preguntas existentes por tema
    const temasConPreguntas = await prisma.question.groupBy({
      by: ['temaCodigo'],
      _count: true,
      where: { 
        temaCodigo: { not: null },
        temaParte: categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO'
      }
    })

    const estadisticasTemas = new Map(
      temasConPreguntas.map(t => [t.temaCodigo?.toLowerCase(), t._count])
    )

    console.log(`\n📊 Estadísticas de ${categoria}:`)
    console.log(`   - Total de temas: ${temasFiltrados.length}`)
    console.log(`   - Temas con preguntas: ${temasConPreguntas.length}`)
    console.log(`   - Se generarán ${preguntasPorTema} preguntas nuevas por tema\n`)

    // Procesar TODOS los temas (no solo los pendientes)
    const temasAProcesar = temasFiltrados

    // Crear cuestionario contenedor
    const questionnaire = await prisma.questionnaire.create({
      data: {
        title: `${categoria === 'general' ? 'Temario General' : 'Temario Específico'} - ${new Date().toLocaleDateString()}`,
        type: 'theory',
        published: false // No publicar hasta revisar
      }
    })

    let totalPreguntas = 0
    let temasConPreguntasNuevas = 0

    // Generar preguntas para cada tema
    for (const tema of temasAProcesar) {
      const preguntasExistentesCant = estadisticasTemas.get(tema.id.toLowerCase()) || 0
      
      console.log(`\n📝 Procesando: Tema ${tema.numero} - ${tema.titulo}`)
      console.log(`   ℹ️  Preguntas existentes: ${preguntasExistentesCant}`)

      // Obtener preguntas existentes de este tema para evitar duplicados
      const preguntasExistentes = await prisma.question.findMany({
        where: {
          temaCodigo: tema.id.toUpperCase()
        },
        select: {
          text: true
        }
      })

      const preguntas = await generarPreguntasParaTema(
        tema.id,
        tema.numero,
        tema.titulo,
        tema.descripcion,
        tema.categoria,
        preguntasPorTema,
        preguntasExistentes.map(p => p.text)
      )

      if (preguntas.length === 0) {
        console.log(`   ⚠️  No se generaron preguntas`)
        continue
      }

      // Filtrar duplicados por similaridad
      const preguntasFiltradas = filtrarDuplicadosPorSimilaridad(
        preguntas,
        preguntasExistentes.map(p => p.text)
      )

      if (preguntasFiltradas.length === 0) {
        console.log(`   ⚠️  Todas las preguntas generadas eran duplicadas`)
        continue
      }

      if (preguntasFiltradas.length < preguntas.length) {
        console.log(`   🔍 Filtradas ${preguntas.length - preguntasFiltradas.length} preguntas duplicadas/similares`)
      }

      // Guardar preguntas en la BD
      for (const p of preguntasFiltradas) {
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: p.pregunta,
            options: JSON.stringify(p.opciones),
            correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta],
            explanation: p.explicacion,
            temaCodigo: tema.id.toUpperCase(),
            temaNumero: tema.numero,
            temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
            temaTitulo: tema.titulo,
            difficulty: p.dificultad
          }
        })
      }

      totalPreguntas += preguntasFiltradas.length
      temasConPreguntasNuevas++
      
      console.log(`   ✅ ${preguntasFiltradas.length} preguntas guardadas`)

      // Pequeña pausa para evitar rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return NextResponse.json({
      success: true,
      message: `Generación completada para ${categoria}`,
      questionnaireId: questionnaire.id,
      temasProcesados: temasConPreguntasNuevas,
      temasTotal: temasAProcesar.length,
      preguntasGeneradas: totalPreguntas
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[Bulk Generate] Error:', error)
    
    // Registrar error crítico en sistema de monitoreo
    await logError({
      errorType: 'API_ERROR',
      severity: 'high',
      endpoint: 'POST /api/admin/generate-bulk-questions',
      statusCode: 500,
      message: `Bulk question generation failed: ${errorMessage}`,
      stack: errorStack,
      context: {
        operation: 'generate-bulk-questions'
      },
      notifyAdmin: true
    }).catch((logErr) => {
      console.error('[Bulk Generate] Failed to log error:', logErr)
    })
    
    return NextResponse.json({ 
      error: 'Error al generar preguntas',
      details: errorMessage
    }, { status: 500 })
  }
}

// Función auxiliar para normalizar valores de dificultad
function normalizarDificultad(valor: string): 'facil' | 'media' | 'dificil' {
  const normalizado = valor?.toLowerCase().trim() || 'media'
  
  if (normalizado.includes('facil') || normalizado.includes('fácil') || normalizado.includes('baja') || normalizado.includes('easy')) {
    return 'facil'
  }
  if (normalizado.includes('dificil') || normalizado.includes('difícil') || normalizado.includes('alta') || normalizado.includes('hard')) {
    return 'dificil'
  }
  return 'media'
}

async function generarPreguntasLGSS(
  numPreguntas: number = 30
): Promise<PreguntaGenerada[]> {
  
  console.log(`[LGSS] Iniciando generación de ${numPreguntas} preguntas sobre LGSS RDL 8/2015...`)
  
  // Validar que Groq API Key esté disponible
  if (!process.env.GROQ_API_KEY) {
    console.error('[LGSS] ❌ GROQ_API_KEY no está definida en variables de entorno')
    return []
  }
  
  const prompt = `CONTEXTO: Eres un EXPERTO JURÍDICO especializado en la Ley General de la Seguridad Social (RDL 8/2015), con amplia experiencia en la elaboración de preguntas para los exámenes oficiales de oposiciones al Cuerpo General Administrativo de la Seguridad Social.

OBJETIVO: Generar ${numPreguntas} preguntas tipo test profesionales basadas en exámenes oficiales reales de los últimos años (2022-2025).

ESTÁNDAR DE CALIDAD:
- Las preguntas deben tener el mismo nivel de rigor y complejidad que los exámenes oficiales
- Lenguaje estrictamente profesional y legal
- Referencias precisas a artículos, apartados y párrafos específicos del RDL 8/2015
- Inclusión de normativa relacionada: Real Decreto 1606/1985, Orden de 6 de abril de 1990, etc.
- Las opciones incorrectas deben basarse en errores comunes o confusiones reales del alumnado

TEMAS PRINCIPALES (distribuye preguntas uniformemente):
1. Objeto y ámbito de aplicación de la LGSS (Art. 1-5)
2. Regímenes de la Seguridad Social (Art. 6-73) - General, Especiales, Autónomos
3. Afiliación a la Seguridad Social (Art. 74-125) - Alta, Baja, Variaciones
4. Cotización: bases, porcentajes y responsables (Art. 129-145)
5. Recaudación, gestión de cuotas y bases de cotización (Art. 146-175)
6. Estructura administrativa de la Seguridad Social (Art. 176-190)
7. Prestaciones por Jubilación (Art. 199-216) - Ordinaria, anticipada, flexible
8. Prestaciones por Incapacidad Temporal (Art. 128-135)
9. Prestaciones por Incapacidad Permanente (Art. 137-151)
10. Prestaciones por muerte y supervivencia (Art. 220-240)
11. Prestaciones familiares y maternidad/paternidad (Art. 177-198)
12. Desempleo, accidentes de trabajo y enfermedades profesionales (Art. 200-219)

REQUISITOS OBLIGATORIOS:
✓ 4 opciones por pregunta (UNA SOLA correcta)
✓ Lenguaje completamente legal y profesional
✓ CADA EXPLICACIÓN DEBE INCLUIR:
  - Referencia específica: "Artículo X, apartado Y del RDL 8/2015"
  - Cita textual o paráfrasis precisa de la normativa
  - Normativa complementaria si aplica (Órdenes Ministeriales, RR.DD., etc.)
  - Explicación del porqué de la respuesta y por qué son incorrectas las otras opciones
✓ Distribución de dificultad: 30% fácil, 50% media, 20% difícil
✓ Las opciones incorrectas deben ser "distractores plausibles" basados en:
  - Interpretaciones erróneas de la normativa
  - Confusión con otros regímenes o prestaciones
  - Datos que casi cumplen requisitos pero con pequeñas diferencias
✓ Varía la posición de la respuesta correcta (no siempre en la opción A)

EJEMPLOS DE PREGUNTAS DE EXÁMENES REALES (estilo a seguir):
"Según el artículo 129 del RDL 8/2015, ¿cuál es la base mínima de cotización en el régimen general para el año 2025?"
"De conformidad con el artículo 15 de la Orden de 6 de abril de 1990, ¿qué sucede con la afiliación de un trabajador que cambia de actividad dentro de la misma empresa?"
"A tenor de lo establecido en el artículo 199 del RDL 8/2015, ¿cuál es el período mínimo de cotización necesario para causar derecho a jubilación ordinaria?"

FORMATO JSON OBLIGATORIO (es crítico):
[
  {
    "pregunta": "Texto de la pregunta en formato oficial de examen",
    "opciones": [
      "Opción A con datos/normas específicas",
      "Opción B con error plausible",
      "Opción C con confusión común",
      "Opción D con dato similar pero incorrecto"
    ],
    "respuestaCorrecta": 0,
    "explicacion": "Artículo X, apartado Y del RDL 8/2015: [cita textual]. Por lo tanto, la respuesta correcta es A porque... Las opciones B, C y D son incorrectas porque... [referencias complementarias si aplica]",
    "dificultad": "media"
  }
]

INSTRUCCIONES FINALES:
- Responde SOLO con el array JSON válido, sin texto adicional
- Verifica que el JSON sea parseable
- Asegúrate de que las explicaciones sean exhaustivas con referencias exactas
- dificultad: "facil", "media" o "dificil"
- respuestaCorrecta: 0=A, 1=B, 2=C, 3=D`

  try {
    console.log('[LGSS] Llamando a Groq API...')
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en crear preguntas sobre la Ley General de la Seguridad Social. Respondes siempre en formato JSON válido y bien formado.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000
    })

    const responseText = completion.choices[0]?.message?.content || ''
    console.log('[LGSS] Respuesta recibida de Groq, longitud:', responseText.length)
    
    if (!responseText) {
      console.error('[LGSS] Respuesta vacía de Groq')
      return []
    }

    // Intentar parsear la respuesta JSON
    let preguntas: PreguntaGenerada[] = []
    try {
      // Limpiar la respuesta de caracteres no deseados
      const cleanedResponse = responseText.trim()
      preguntas = JSON.parse(cleanedResponse) as PreguntaGenerada[]
      console.log(`[LGSS] ✅ Parseadas ${preguntas.length} preguntas sobre LGSS`)
    } catch (parseError) {
      console.error('[LGSS] Error parseando JSON:', parseError)
      console.log('[LGSS] Respuesta recibida (primeros 500 caracteres):', responseText.substring(0, 500))
      return []
    }

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      console.error('[LGSS] Respuesta no es un array válido o está vacía')
      return []
    }

    // Normalizar valores de dificultad
    preguntas = preguntas.map(p => ({
      ...p,
      dificultad: normalizarDificultad(p.dificultad as string)
    }))

    console.log(`[LGSS] ✅ Generadas ${preguntas.length} preguntas sobre LGSS exitosamente`)
    return preguntas
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[LGSS] Error generando preguntas LGSS:', error)
    if (error instanceof Error) {
      console.error('[LGSS] Detalles del error:', error.message)
      console.error('[LGSS] Stack:', error.stack)
    }
    
    // Registrar error en sistema de monitoreo
    await logError({
      errorType: 'EXTERNAL_SERVICE_ERROR',
      severity: 'high',
      endpoint: 'POST /api/admin/generate-bulk-questions (LGSS)',
      message: `LGSS question generation failed: ${errorMessage}`,
      stack: errorStack,
      context: {
        service: 'Groq',
        operation: 'generarPreguntasLGSS',
        numPreguntas
      },
      notifyAdmin: true
    }).catch((logErr) => {
      console.error('[LGSS] Failed to log error:', logErr)
    })
    
    return []
  }
}

async function generarPreguntasParaTema(
  temaId: string,
  temaNumero: number,
  temaTitulo: string,
  temaDescripcion: string,
  categoria: 'general' | 'especifico',
  numPreguntas: number = 20,
  preguntasExistentes: string[] = []
): Promise<PreguntaGenerada[]> {
  
  // Construir texto con preguntas existentes para evitar duplicados
  let seccionPreguntasExistentes = ''
  if (preguntasExistentes.length > 0) {
    const preguntasMostrar = preguntasExistentes.slice(0, 50) // Mostrar hasta 50 preguntas
    seccionPreguntasExistentes = `

⚠️ PREGUNTAS YA EXISTENTES DE ESTE TEMA (${preguntasExistentes.length} en total):
${preguntasMostrar.map((p, i) => `${i + 1}. ${p}`).join('\n')}
${preguntasExistentes.length > 50 ? '\n... y ' + (preguntasExistentes.length - 50) + ' más.' : ''}

🚫 IMPORTANTE: NO REPITAS ni REFORMULES ninguna de estas preguntas existentes.
Genera preguntas COMPLETAMENTE NUEVAS sobre aspectos diferentes del tema.
`
  }

  const prompt = `CONTEXTO: Eres un EXPERTO en la elaboración de preguntas para exámenes oficiales de oposiciones al Cuerpo General Administrativo de la Seguridad Social. Tienes experiencia en exámenes reales de 2022-2025.

OBJETIVO: Generar ${numPreguntas} preguntas tipo test basadas en ${categoria === 'general' ? 'Temario General (Constitución, Administración Pública, etc.)' : 'Temario Específico (Seguridad Social, Derecho Laboral, etc.)'} con el máximo rigor académico y profesional.

TEMA A TRABAJAR:
- NÚMERO: Tema ${temaNumero}
- TÍTULO: ${temaTitulo}
- DESCRIPCIÓN: ${temaDescripcion}
- NIVEL: ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}
${seccionPreguntasExistentes}

ESTÁNDAR DE CALIDAD OBLIGATORIO:
✓ Lenguaje completamente formal, legal y profesional
✓ Contenido basado en normativa oficial y jurisprudencia consolidada
✓ Preguntas directas sin ambigüedades (formato de examen oficial)
✓ EXPLICACIONES EXHAUSTIVAS que incluyan:
  - Referencia exacta a artículos, apartados y párrafos de la normativa
  - Cita de leyes, decretos, órdenes ministeriales
  - Explicación del concepto jurídico clave
  - Por qué las otras opciones son incorrectas (indicar el error en cada una)
✓ Opciones creadas como "distractores reales": errores comunes, confusiones frecuentes, datos parcialmente correctos
✓ Distribución de dificultad: 40% fácil, 40% media, 20% difícil
✓ Variación en la posición de la respuesta correcta

NORMAS DE REDACCIÓN:
1. Las preguntas deben ser claras y directas (nunca negativas como "¿Cuál NO es...?")
2. Usa vocabulario exacto de la normativa
3. Incluye referencias precisas: "Según el artículo X de la Ley Y..." o "De conformidad con..."
4. Las opciones deben ser mutuamente excluyentes y plausibles
5. Una sola respuesta correcta, inequívocamente clara con la normativa

FORMATO JSON OBLIGATORIO (es crítico que sea válido):
[
  {
    "pregunta": "Texto de la pregunta con referencia a normativa cuando aplique",
    "opciones": [
      "Opción A - respuesta correcta con datos específicos",
      "Opción B - error común o confusión habitual",
      "Opción C - interpretación errónea de la norma",
      "Opción D - dato similar pero incorrecto"
    ],
    "respuestaCorrecta": 0,
    "explicacion": "[Artículo/Ley]: Cita o paráfrasis de la norma. La opción A es correcta porque... Las opciones B/C/D son incorrectas porque... [referencias complementarias]",
    "dificultad": "media"
  }
]

INSTRUCCIONES FINALES:
- Responde SOLO con el array JSON válido
- Verifica que sea JSON parseble
- dificultad: "facil" (preguntas directas), "media" (requieren análisis), "dificil" (análisis profundo o combinación de conceptos)
- respuestaCorrecta: 0=A, 1=B, 2=C, 3=D
- NO incluyas explicaciones antes ni después del JSON`

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Eres un experto jurídico en oposiciones a la Administración Pública. Tus preguntas son rigurosas, profesionales y basadas en normativa oficial. Responde SIEMPRE en formato JSON válido y bien formado.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return []
    }

    // Intentar parsear diferentes formatos de respuesta
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      // Intentar extraer JSON del contenido
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        return []
      }
    }

    // Normalizar formato
    const preguntas = Array.isArray(parsed) ? parsed : (parsed.preguntas || parsed.questions || [])
    
    return preguntas.map((p: any) => ({
      pregunta: p.pregunta || p.question || p.text,
      opciones: p.opciones || p.options || [],
      respuestaCorrecta: typeof p.respuestaCorrecta === 'number' ? p.respuestaCorrecta : 
                         (p.correctAnswer || p.correct || 0),
      explicacion: p.explicacion || p.explanation || '',
      dificultad: normalizarDificultad((p.dificultad || p.difficulty || 'media') as string)
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`Error generando preguntas para tema ${temaNumero}:`, error)
    
    // Registrar error en sistema de monitoreo
    await logError({
      errorType: 'EXTERNAL_SERVICE_ERROR',
      severity: 'medium',
      endpoint: 'POST /api/admin/generate-bulk-questions (tema específico)',
      message: `Theme question generation failed for tema ${temaNumero}: ${errorMessage}`,
      stack: errorStack,
      context: {
        service: 'Groq',
        operation: 'generarPreguntasParaTema',
        temaNumero,
        temaTitulo,
        categoria,
        numPreguntas
      },
      notifyAdmin: false // No notificar por cada tema fallido
    }).catch((logErr) => {
      console.error('Failed to log error:', logErr)
    })
    
    return []
  }
}
