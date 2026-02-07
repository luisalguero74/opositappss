import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'
import { logError } from '@/lib/error-logger'
import { temaCodigoFromTemaOficialId, temaCodigoVariants } from '@/lib/tema-codigo'
import { PROMPT_MEJORADO_LGSS, PROMPT_MEJORADO_TEMAGENERAL } from '@/lib/prompts-mejorados'
import { ValidadorPreguntas } from '@/lib/validador-preguntas'
import { buscarDocumentosLegalesParaTema, enriquecerPromptConRAG, generarContextoLGSS } from '@/lib/rag-questions'
import { rebalancePreguntasPorIndice } from '@/lib/answer-alternation'
// Configuración aumentada para evitar timeouts
export const maxDuration = 300 // 5 minutos
export const dynamic = 'force-dynamic'

// Usar fetch directo en lugar de SDK para evitar problemas de conectividad en Vercel
async function callGroqWithRetry(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  model: string,
  temperature: number,
  max_tokens: number,
  maxAttempts = 5
) {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const GROQ_API_KEY = process.env.GROQ_API_KEY

  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Groq Attempt ${attempt}/${maxAttempts}] Calling API with fetch...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout
      
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
        const errorText = await response.text()
        throw new Error(`Groq API error ${response.status}: ${errorText}`)
      }

      const completion = await response.json()
      console.log(`[Groq Attempt ${attempt}] Success!`)
      return completion
      
    } catch (error: any) {
      console.error(`[Groq Attempt ${attempt}] Error:`, error.message)
      
      if (attempt === maxAttempts) {
        throw error
      }
      
      // Backoff exponencial: 2s, 4s, 8s, 16s
      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`[Groq] Waiting ${waitTime/1000}s before retry...`)
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

function normalizarRespuestaCorrecta(valor: unknown): number {
  // Esperado: 0..3. A veces viene 1..4 o como letra ("A", "b)").
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    if (valor >= 0 && valor <= 3) return Math.trunc(valor)
    if (valor >= 1 && valor <= 4) return Math.trunc(valor - 1)
    return 0
  }

  if (typeof valor === 'string') {
    const v = valor.trim().toUpperCase()
    if (!v) return 0
    if (/^[0-4]$/.test(v)) {
      const n = Number.parseInt(v, 10)
      if (n >= 0 && n <= 3) return n
      if (n >= 1 && n <= 4) return n - 1
    }

    const m = v.match(/^([ABCD])\s*[)\].\-:]?/) // A, A), A.
    if (m) {
      return { A: 0, B: 1, C: 2, D: 3 }[m[1] as 'A' | 'B' | 'C' | 'D']
    }
  }

  return 0
}

function normalizarOpciones(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor
      .filter((x): x is string => typeof x === 'string')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 4)
  }

  if (valor && typeof valor === 'object') {
    const obj = valor as Record<string, unknown>
    const a = typeof obj.a === 'string' ? obj.a : typeof obj.A === 'string' ? obj.A : undefined
    const b = typeof obj.b === 'string' ? obj.b : typeof obj.B === 'string' ? obj.B : undefined
    const c = typeof obj.c === 'string' ? obj.c : typeof obj.C === 'string' ? obj.C : undefined
    const d = typeof obj.d === 'string' ? obj.d : typeof obj.D === 'string' ? obj.D : undefined
    const arr = [a, b, c, d]
      .filter((x): x is string => typeof x === 'string')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 4)
    return arr
  }

  return []
}

function extraerArrayPreguntas(parsed: any): any[] {
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    const candidates = [
      (parsed as any).preguntas,
      (parsed as any).questions,
      (parsed as any).items,
      (parsed as any).data,
      (parsed as any).result
    ]
    const fromKnown = candidates.find(v => Array.isArray(v))
    if (Array.isArray(fromKnown)) return fromKnown
    const firstArray = Object.values(parsed).find(v => Array.isArray(v))
    if (Array.isArray(firstArray)) return firstArray
  }
  return []
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

    const normalizeSecret = (value: string | null | undefined) =>
      String(value || '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .trim()

    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    const receivedApiKey = normalizeSecret(req.headers.get('x-api-key'))
    const apiKeyOk = Boolean(expectedApiKey && receivedApiKey && expectedApiKey === receivedApiKey)

    const isAdminSession = Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
    if (!isAdminSession && !apiKeyOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Evitar ejecuciones “silenciosas” con 0 resultados cuando falta la API key
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        {
          error: 'GROQ_API_KEY no está configurada',
          details: 'Configura GROQ_API_KEY en las variables de entorno de Vercel (.env) para poder generar preguntas.'
        },
        { status: 500 }
      )
    }
    // Verificar conexión a base de datos
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (dbError) {
      console.error('[Bulk Generate] Database connection error:', dbError)
      return NextResponse.json(
        {
          error: 'Error de conexión a base de datos',
          details: dbError instanceof Error ? dbError.message : 'No se puede conectar a la base de datos de producción'
        },
        { status: 500 }
      )
    }
    const body = await req.json()
    const { categoria, preguntasPorTema = 20, temaIds, questionnaireId } = body as {
      categoria?: string
      preguntasPorTema?: number
      temaIds?: unknown
      questionnaireId?: string
    }

    const requestedTemaIds = Array.isArray(temaIds)
      ? (temaIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) as string[])
      : undefined

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
        return NextResponse.json(
          {
            error: 'No se pudo generar preguntas sobre LGSS',
            details: 'Groq devolvió 0 preguntas o la respuesta no pasó validación/parseo.'
          },
          { status: 500 }
        )
      }

      // Guardar preguntas
      const preguntasLGSSRebalanceadas = rebalancePreguntasPorIndice(preguntasLGSS, 2)
      for (const p of preguntasLGSSRebalanceadas) {
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
      temasConPreguntas.map(t => [
        t.temaCodigo?.toLowerCase(),
        (t as any)?._count?._all ?? (t as any)?._count ?? 0
      ])
    )

    console.log(`\n📊 Estadísticas de ${categoria}:`)
    console.log(`   - Total de temas: ${temasFiltrados.length}`)
    console.log(`   - Temas con preguntas: ${temasConPreguntas.length}`)
    console.log(`   - Se generarán ${preguntasPorTema} preguntas nuevas por tema\n`)

    // Procesar temas (por lotes si se especifica temaIds)
    const temasAProcesar = requestedTemaIds && requestedTemaIds.length > 0
      ? temasFiltrados.filter(t => requestedTemaIds.includes(t.id))
      : temasFiltrados

    // Crear o reutilizar cuestionario contenedor
    const questionnaire = questionnaireId
      ? await prisma.questionnaire.findUnique({ where: { id: questionnaireId } })
      : await prisma.questionnaire.create({
          data: {
            title: `${categoria === 'general' ? 'Temario General' : 'Temario Específico'} - ${new Date().toLocaleDateString()}`,
            type: 'theory',
            published: false // No publicar hasta revisar
          }
        })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
    }

    let totalPreguntas = 0
    let temasConPreguntasNuevas = 0
    let temasIntentados = 0
    const preguntasCreadasPorTema: Array<{ temaId: string; temaNumero: number; temaTitulo: string; preguntasCreadas: number; error?: string }> = []
    const erroresPorTema: Array<{ temaId: string; temaNumero: number; temaTitulo: string; error: string }> = []

    // Generar preguntas para cada tema
    for (const tema of temasAProcesar) {
      temasIntentados++
      const codigoCanonico = temaCodigoFromTemaOficialId(tema.id) ?? tema.id.toUpperCase()
      const variantes = temaCodigoVariants(tema.id)
      const preguntasExistentesCant = Math.max(
        ...variantes.map(v => Number(estadisticasTemas.get(v.toLowerCase()) ?? 0))
      )
      
      console.log(`\n📝 Procesando: Tema ${tema.numero} - ${tema.titulo}`)
      console.log(`   ℹ️  Preguntas existentes: ${preguntasExistentesCant}`)

      // Obtener preguntas existentes de este tema para evitar duplicados
      const preguntasExistentes = await prisma.question.findMany({
        where: {
          temaCodigo: { in: variantes.map(v => v.toUpperCase()) }
        },
        select: {
          text: true
        }
      })

      let preguntas: PreguntaGenerada[] = []
      try {
        preguntas = await generarPreguntasParaTema(
          tema.id,
          tema.numero,
          tema.titulo,
          tema.descripcion,
          tema.categoria,
          preguntasPorTema,
          preguntasExistentes.map(p => p.text)
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erroresPorTema.push({ temaId: tema.id, temaNumero: tema.numero, temaTitulo: tema.titulo, error: msg })
        preguntasCreadasPorTema.push({
          temaId: tema.id,
          temaNumero: tema.numero,
          temaTitulo: tema.titulo,
          preguntasCreadas: 0,
          error: msg
        })
        continue
      }

      if (preguntas.length === 0) {
        console.log(`   ⚠️  No se generaron preguntas`)
        preguntasCreadasPorTema.push({
          temaId: tema.id,
          temaNumero: tema.numero,
          temaTitulo: tema.titulo,
          preguntasCreadas: 0
        })
        continue
      }

      // Filtrar duplicados por similaridad
      const preguntasFiltradas = filtrarDuplicadosPorSimilaridad(
        preguntas,
        preguntasExistentes.map(p => p.text)
      )

      if (preguntasFiltradas.length === 0) {
        console.log(`   ⚠️  Todas las preguntas generadas eran duplicadas`)
        preguntasCreadasPorTema.push({
          temaId: tema.id,
          temaNumero: tema.numero,
          temaTitulo: tema.titulo,
          preguntasCreadas: 0
        })
        continue
      }

      if (preguntasFiltradas.length < preguntas.length) {
        console.log(`   🔍 Filtradas ${preguntas.length - preguntasFiltradas.length} preguntas duplicadas/similares`)
      }

      const preguntasRebalanceadas = rebalancePreguntasPorIndice(preguntasFiltradas, 2)

      // Guardar preguntas en la BD
      for (const p of preguntasRebalanceadas) {
        await prisma.question.create({
          data: {
            questionnaireId: questionnaire.id,
            text: p.pregunta,
            options: JSON.stringify(p.opciones),
            correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta],
            explanation: p.explicacion,
            temaCodigo: codigoCanonico,
            temaNumero: tema.numero,
            temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
            temaTitulo: tema.titulo,
            difficulty: p.dificultad
          }
        })
      }

      totalPreguntas += preguntasRebalanceadas.length
      temasConPreguntasNuevas++

      preguntasCreadasPorTema.push({
        temaId: tema.id,
        temaNumero: tema.numero,
        temaTitulo: tema.titulo,
        preguntasCreadas: preguntasRebalanceadas.length
      })
      
      console.log(`   ✅ ${preguntasFiltradas.length} preguntas guardadas`)

      // Pequeña pausa para evitar rate limits (solo cuando se procesan varios temas en una misma petición)
      if (temasAProcesar.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Si no se creó ninguna pregunta, devolver error con detalles para que no aparezca como "éxito".
    if (totalPreguntas === 0) {
      const topError = erroresPorTema[0]?.error
      return NextResponse.json(
        {
          error: 'No se crearon preguntas',
          details: topError || 'Groq devolvió 0 preguntas o fueron filtradas como duplicadas.',
          temasProcesados: temasIntentados,
          temasTotal: temasAProcesar.length,
          preguntasGeneradas: 0,
          preguntasPorTema: preguntasCreadasPorTema
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Generación completada para ${categoria}`,
      questionnaireId: questionnaire.id,
      temasProcesados: temasIntentados,
      temasConPreguntasNuevas,
      temasTotal: temasAProcesar.length,
      preguntasGeneradas: totalPreguntas,
      preguntasPorTema: preguntasCreadasPorTema
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
    throw new Error('GROQ_API_KEY no está configurada')
  }
  
  // 🔍 SISTEMA RAG: Consultar documentos legales de la biblioteca
  console.log('[LGSS] 📚 Consultando biblioteca legal...')
  const documentosLegales = await generarContextoLGSS()
  console.log(`[LGSS] ✅ Cargados ${documentosLegales.length} documentos de LGSS`)
  
  // Usar el prompt mejorado con ejemplos reales
  let prompt = PROMPT_MEJORADO_LGSS(numPreguntas)
  
  // Enriquecer prompt con documentos legales de la biblioteca
  if (documentosLegales.length > 0) {
    prompt = enriquecerPromptConRAG(prompt, documentosLegales)
    console.log('[LGSS] ✨ Prompt enriquecido con contexto legal de la biblioteca')
  } else {
    console.warn('[LGSS] ⚠️ No se encontraron documentos de LGSS en la biblioteca')
  }

  const systemContentLGSS = documentosLegales.length > 0
    ? 'Eres un experto jurídico en Seguridad Social, especializado en la preparación de oposiciones del Cuerpo Administrativo de la Seguridad Social (C1). La base jurídica (artículos, números, plazos, órganos, requisitos) debe salir EXCLUSIVAMENTE de la información contenida en los documentos legales proporcionados como contexto. Puedes usar tu conocimiento general solo para mejorar la redacción y la claridad de las preguntas y explicaciones, sin añadir datos jurídicos nuevos que no aparezcan en esos documentos. Cita de forma muy fiel (preferentemente de manera textual) los artículos relevantes. Respondes siempre en formato JSON válido y bien formado.'
    : 'Eres un experto jurídico en Seguridad Social (C1). No se ha proporcionado contexto documental (RAG). Genera preguntas en formato JSON válido, basándote en normativa vigente de forma prudente: si no estás seguro de un número de artículo o de una cita literal, evita afirmaciones numéricas o citas textuales inventadas y prioriza formulaciones verificables. Responde SOLO con JSON.'

  try {
    console.log('[LGSS] Llamando a Groq API con prompt mejorado y RAG...')
    const completion = await callGroqWithRetry(
      [
        {
          role: 'system',
          content: systemContentLGSS
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'llama-3.3-70b-versatile',
      0.3, // Reducido de 0.7 a 0.3 para mayor precisión legal
      4000
    )

    const responseText = completion.choices[0]?.message?.content || ''
    console.log('[LGSS] Respuesta recibida de Groq, longitud:', responseText.length)
    
    if (!responseText) {
      console.error('[LGSS] Respuesta vacía de Groq')
      return []
    }

    // Intentar parsear la respuesta JSON (tolerante a ```json, texto extra, wrappers)
    let parsed: any
    try {
      parsed = JSON.parse(responseText.trim())
    } catch (e) {
      const arrayMatch = responseText.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        parsed = JSON.parse(arrayMatch[0])
      } else {
        const objMatch = responseText.match(/\{[\s\S]*\}/)
        if (objMatch) {
          parsed = JSON.parse(objMatch[0])
        } else {
          console.error('[LGSS] Error parseando JSON:', e)
          console.log('[LGSS] Respuesta recibida (primeros 500 caracteres):', responseText.substring(0, 500))
          throw new Error('La respuesta de Groq no contiene JSON parseable (array/obj).')
        }
      }
    }

    const items = extraerArrayPreguntas(parsed)
    const preguntas = items
      .map((p: any) => {
        const opciones = normalizarOpciones(p?.opciones ?? p?.options ?? p?.answers)
        const respuestaCorrecta = normalizarRespuestaCorrecta(p?.respuestaCorrecta ?? p?.correctAnswer ?? p?.correct ?? p?.answer)
        return {
          pregunta: String(p?.pregunta ?? p?.question ?? p?.text ?? '').trim(),
          opciones,
          respuestaCorrecta,
          explicacion: String(p?.explicacion ?? p?.explanation ?? '').trim(),
          dificultad: normalizarDificultad((p?.dificultad ?? p?.difficulty ?? 'media') as string)
        } satisfies PreguntaGenerada
      })
      .filter((p: PreguntaGenerada) => p.pregunta && p.opciones.length === 4)

    console.log(`[LGSS] ✅ Parseadas ${preguntas.length} preguntas sobre LGSS`)

    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      console.error('[LGSS] Respuesta no es un array válido o está vacía')
      return []
    }

    // VALIDAR CALIDAD DE LAS PREGUNTAS
    console.log('[LGSS] 🔍 Validando calidad de las preguntas generadas...')
    const resultadoValidacion = ValidadorPreguntas.validarLote(preguntas)
    console.log(resultadoValidacion.reporteGeneral)

    // Filtrar solo preguntas válidas
    const preguntasValidadas = preguntas.filter((p, i) => {
      const validacion = ValidadorPreguntas.validar(p)
      if (!validacion.valida) {
        console.log(`   ⚠️ Pregunta ${i + 1} rechazada (puntuación ${validacion.puntuacion}/100):`)
        console.log(`      Errores: ${validacion.errores.join(', ')}`)
        return false
      }
      if (validacion.advertencias.length > 0) {
        console.log(`   ℹ️ Pregunta ${i + 1} con advertencias: ${validacion.advertencias.join(', ')}`)
      }
      return true
    })

    // Normalizar valores de dificultad
    const preguntasNormalizadas = preguntasValidadas.map(p => ({
      ...p,
      dificultad: normalizarDificultad(p.dificultad as string)
    }))

    console.log(`[LGSS] ✅ Generadas ${preguntasNormalizadas.length}/${preguntas.length} preguntas válidas sobre LGSS`)
    return preguntasNormalizadas
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
    
    throw new Error(errorMessage)
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
  
  console.log(`[Tema ${temaNumero}] Iniciando generación con RAG...`)
  
  // 🔍 SISTEMA RAG: Buscar documentos legales relevantes en la biblioteca
  console.log(`[Tema ${temaNumero}] 📚 Consultando biblioteca legal...`)
  const documentosRAG = await buscarDocumentosLegalesParaTema(
    temaId,
    temaNumero,
    temaTitulo,
    temaDescripcion,
    categoria
  )
  console.log(`[Tema ${temaNumero}] ✅ Encontrados ${documentosRAG.length} documentos relevantes`)
  
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

  // Usar prompt mejorado
  let prompt = PROMPT_MEJORADO_TEMAGENERAL(
    temaNumero,
    temaTitulo,
    temaDescripcion,
    categoria,
    numPreguntas,
    preguntasExistentes
  )
  
  // Enriquecer prompt con documentos RAG si existen
  if (documentosRAG.length > 0) {
    prompt = enriquecerPromptConRAG(prompt, documentosRAG)
    console.log(`[Tema ${temaNumero}] ✨ Prompt enriquecido con ${documentosRAG.length} documentos legales`)
  } else {
    console.log(`[Tema ${temaNumero}] ⚠️ No se encontraron documentos legales relevantes en biblioteca`)
  }

  const systemContentTema = documentosRAG.length > 0
    ? 'Eres un experto jurídico en oposiciones del Cuerpo Administrativo de la Seguridad Social (C1). La base jurídica (artículos, números, plazos, órganos, requisitos) debe salir EXCLUSIVAMENTE de la información contenida en los documentos legales oficiales proporcionados (BOE, textos consolidados, Aranzadi, Universidad de Deusto, etc.). Puedes usar tu conocimiento general solo para mejorar la redacción y la claridad de las preguntas y explicaciones, sin añadir datos jurídicos nuevos que no aparezcan en esos documentos. Cita de forma muy fiel (preferentemente de manera textual) los artículos relevantes. Responde siempre en JSON válido.'
    : 'Eres un experto en crear preguntas de examen C1. No se ha proporcionado contexto documental (RAG). Genera preguntas en JSON válido y bien formado. Evita inventar citas textuales o números de artículo si no estás seguro; prioriza formulaciones verificables y consistentes. Responde siempre en JSON válido.'

  try {
    console.log(`[Tema ${temaNumero}] Llamando a Groq API con RAG...`)
    const completion = await callGroqWithRetry(
      [
        {
          role: 'system',
          content: systemContentTema
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      'llama-3.3-70b-versatile',
      0.3, // Reducido de 0.7 a 0.3 para mayor precisión con RAG
      8000
    )

    const content = completion.choices[0]?.message?.content
    if (!content) {
      console.log(`[Tema ${temaNumero}] ⚠️ Respuesta vacía de Groq`)
      return []
    }

    console.log(`[Tema ${temaNumero}] ✅ Respuesta recibida, parseando...`)

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

    const preguntas = extraerArrayPreguntas(parsed)
    return preguntas
      .map((p: any) => {
        const opciones = normalizarOpciones(p?.opciones ?? p?.options ?? p?.answers)
        const respuestaCorrecta = normalizarRespuestaCorrecta(p?.respuestaCorrecta ?? p?.correctAnswer ?? p?.correct ?? p?.answer)
        return {
          pregunta: String(p?.pregunta ?? p?.question ?? p?.text ?? '').trim(),
          opciones,
          respuestaCorrecta,
          explicacion: String(p?.explicacion ?? p?.explanation ?? '').trim(),
          dificultad: normalizarDificultad((p?.dificultad ?? p?.difficulty ?? 'media') as string)
        } satisfies PreguntaGenerada
      })
        .filter((p: PreguntaGenerada) => p.pregunta && p.opciones.length === 4)
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

    // No “fallar silenciosamente”: el caller decide si continuar o abortar.
    throw new Error(errorMessage)
  }
}
