import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'
import { rebalancePreguntasPorIndice } from '@/lib/answer-alternation'

// Configuración para Vercel Cron
export const maxDuration = 300 // 5 minutos máximo
export const dynamic = 'force-dynamic'

async function ensureCronHeartbeatTableExists() {
  // Idempotent, constant SQL only (no user input).
  // This is a safety net for environments where Prisma migrations were not applied.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cron_run_heartbeat (
      id BIGSERIAL PRIMARY KEY,
      job TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      total_questions INTEGER NOT NULL DEFAULT 0,
      themes_processed INTEGER NOT NULL DEFAULT 0,
      details TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS cron_run_heartbeat_job_created_at_idx
      ON cron_run_heartbeat (job, created_at DESC);
  `)
}

async function recordCronHeartbeat(input: {
  job: string
  success: boolean
  totalQuestions: number
  themesProcessed: number
  details?: unknown
  error?: string | null
}) {
  try {
    await ensureCronHeartbeatTableExists()
    const detailsJson = JSON.stringify(input.details ?? null)

    await prisma.$executeRaw`
      INSERT INTO cron_run_heartbeat (job, success, total_questions, themes_processed, details, error)
      VALUES (
        ${input.job},
        ${input.success},
        ${Math.max(0, Math.floor(input.totalQuestions || 0))},
        ${Math.max(0, Math.floor(input.themesProcessed || 0))},
        ${detailsJson},
        ${input.error ?? null}
      )
    `
  } catch (e) {
    console.warn('[Cron] Heartbeat table write failed; falling back to SystemError:', e)

    try {
      await prisma.systemError.create({
        data: {
          errorType: 'CRON_RUN',
          severity: input.success ? 'low' : 'high',
          endpoint: '/api/cron/generate-questions',
          statusCode: input.success ? 200 : 500,
          message: input.success
            ? `Cron OK (job=${input.job}) totalQuestions=${Math.max(0, Math.floor(input.totalQuestions || 0))} themesProcessed=${Math.max(0, Math.floor(input.themesProcessed || 0))}`
            : `Cron ERROR (job=${input.job}): ${String(input.error || 'unknown error')}`,
          context: JSON.stringify({
            job: input.job,
            success: input.success,
            totalQuestions: Math.max(0, Math.floor(input.totalQuestions || 0)),
            themesProcessed: Math.max(0, Math.floor(input.themesProcessed || 0)),
            details: input.details ?? null,
            error: input.error ?? null
          })
        }
      })
    } catch (e2) {
      console.warn('[Cron] SystemError fallback heartbeat write failed; continuing:', e2)
    }
  }
}

function normalize(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function wordCount(text: string): number {
  const cleaned = normalize(text)
  if (!cleaned) return 0
  return cleaned.split(' ').filter(Boolean).length
}

function extractFirstArticleRef(text: string): string {
  const raw = String(text || '')
  const m = raw.match(/(art[íi]culo|art\.)\s*(\d+(?:\.\d+)?)/i)
  if (!m) return ''
  const num = m[2]
  return num ? `Artículo ${num}` : ''
}

function extractFirstNormRef(text: string): string {
  const raw = String(text || '')
  const m1 = raw.match(/(Real\s+Decreto\s+Legislativo|RDL|Real\s+Decreto)\s*(\d+\/\d{4}|\d+)/i)
  if (m1) return `${m1[1]} ${m1[2]}`.trim()
  const m2 = raw.match(/\b(Ley)\s*(\d+\/\d{4}|\d+)/i)
  if (m2) return `${m2[1]} ${m2[2]}`.trim()
  return ''
}

function ensureCronLegalHeader(explanation: string, baseText: string): string {
  const current = String(explanation || '').trim()
  const hasFundamento = /^Fundamento:/i.test(current)
  const hasArticle = /(art[íi]culo|art\.)\s*\d+(?:\.\d+)?/i.test(current)
  const hasNorm = /(Real\s+Decreto\s+Legislativo|RDL|Ley|Real\s+Decreto)\s*\d+(?:\/\d{4})?/i.test(current)
  if (hasFundamento && hasArticle && hasNorm) return current

  const baseArticle = extractFirstArticleRef(baseText) || 'Artículo 1'
  const baseNorm = extractFirstNormRef(baseText) || 'Real Decreto Legislativo 8/2015'
  const header = `Fundamento: ${baseArticle} de ${baseNorm}`
  return `${header}\n${current}`.trim()
}

type CronValidation = { ok: true } | { ok: false; issues: string[] }

function validatePreguntaCron(p: PreguntaGenerada): CronValidation {
  const issues: string[] = []
  const pregunta = normalize(p?.pregunta)
  const opciones = Array.isArray(p?.opciones) ? p.opciones.map(o => normalize(o)) : []
  const explicacion = normalize(p?.explicacion)

  if (pregunta.length < 70) issues.push('pregunta demasiado corta')
  if (wordCount(pregunta) < 12) issues.push('pregunta poco desarrollada')
  if (opciones.length !== 4) issues.push('no tiene 4 opciones')
  if (opciones.some(o => o.length < 8)) issues.push('opciones demasiado cortas')
  if (new Set(opciones.map(o => o.toLowerCase())).size !== opciones.length) issues.push('opciones duplicadas')

  const rc = Number(p?.respuestaCorrecta)
  if (!Number.isFinite(rc) || rc < 0 || rc > 3) issues.push('respuestaCorrecta fuera de 0-3')

  if (explicacion.length < 220) issues.push('explicacion demasiado corta')
  if (!/^Fundamento:/i.test(explicacion)) issues.push('falta Fundamento:')
  if (!/(art[íi]culo|art\.)\s*\d+(?:\.\d+)?/i.test(explicacion)) issues.push('falta referencia a Artículo X')
  if (!/(Real\s+Decreto\s+Legislativo|RDL|Ley|Real\s+Decreto)\s*\d+(?:\/\d{4})?/i.test(explicacion)) issues.push('falta referencia a Ley/RDL/RD')

  // Heurística: que justifique al menos 2 opciones incorrectas.
  const incorrectMentions = ['A', 'B', 'C', 'D'].reduce((acc, letter) => {
    const re = new RegExp(`\\b(opci[oó]n\\s+${letter}|${letter}\\))\\b`, 'i')
    return acc + (re.test(explicacion) ? 1 : 0)
  }, 0)
  if (incorrectMentions < 2) issues.push('no justifica opciones incorrectas (menciona al menos 2)')

  return issues.length ? { ok: false, issues } : { ok: true }
}

// Función de reintento con fetch directo (igual que en generate-bulk-questions)
async function callGroqWithRetry(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  model: string,
  temperature: number,
  max_tokens: number,
  maxAttempts = 3
) {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const GROQ_API_KEY = String(process.env.GROQ_API_KEY ?? '').trim()

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
  const baseText = `Tema ${temaNumero}: ${temaTitulo}\n${temaDescripcion || ''}`
  const strictBaseArticle = extractFirstArticleRef(baseText) || 'Artículo 1'
  const strictBaseNorm = extractFirstNormRef(baseText) || 'Real Decreto Legislativo 8/2015'

  const buildPrompt = (strictNotes: string) => `Eres un EXAMINADOR senior de oposiciones C1. Genera ${numPreguntas} preguntas tipo test de NIVEL EXAMEN (muy similares a test oficial) sobre:

Tema ${temaNumero}: ${temaTitulo}
Descripción: ${temaDescripcion}
Categoría: ${categoria === 'general' ? 'Temario General' : 'Temario Específico'}

Requisitos:
- Preguntas tipo CASO / aplicación práctica (evita definiciones triviales)
- 4 opciones por pregunta (A,B,C,D) plausibles, solo 1 correcta
- Explicación clara y técnica (mínimo 220 caracteres)
- OBLIGATORIO: la explicación debe empezar por una línea EXACTA: "Fundamento: Artículo X de Ley/RDL/RD ..."
- OBLIGATORIO: incluir al menos 1 referencia a un Artículo (p.ej. "Artículo 21") y a una norma (p.ej. "Real Decreto Legislativo 8/2015" o "Ley 39/2015")
- OBLIGATORIO: justificar por qué al menos 2 opciones incorrectas no son correctas (menciona "Opción A", "Opción B", etc.)
- respuestaCorrecta debe ser un entero 0..3 (0=A,1=B,2=C,3=D)

Referencia mínima recomendada (si no hay otra más específica en la descripción):
- ${strictBaseArticle} de ${strictBaseNorm}

Formato JSON:
[{
  "pregunta": "Texto de la pregunta",
  "opciones": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "respuestaCorrecta": 0,
  "explicacion": "Explicación detallada con referencias",
  "dificultad": "media"
}]

${strictNotes}`

  try {
    let strictNotes = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      const completion = await callGroqWithRetry(
        [
          {
            role: 'system',
            content:
              'Eres un examinador senior. Respondes SOLO en JSON válido (array). No añadas texto fuera del JSON.'
          },
          { role: 'user', content: buildPrompt(strictNotes) }
        ],
        'llama-3.3-70b-versatile',
        attempt === 1 ? 0.45 : attempt === 2 ? 0.3 : 0.2,
        3200,
        2
      )

      const content = completion.choices?.[0]?.message?.content
      if (!content) {
        strictNotes = '\n\n⚠️ No has devuelto contenido. Devuelve SOLO el JSON.'
        continue
      }

      const jsonMatch = String(content).match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        strictNotes =
          '\n\n⚠️ Tu respuesta no contiene un JSON array válido. Devuelve SOLO el JSON con el formato requerido.'
        continue
      }

      const parsed = JSON.parse(jsonMatch[0]) as PreguntaGenerada[]
      const sanitized = (Array.isArray(parsed) ? parsed : [])
        .filter(p => p && p.pregunta && Array.isArray(p.opciones) && p.opciones.length === 4)
        .map((p) => {
          const rc = Number(p.respuestaCorrecta)
          const rcFixed = Number.isFinite(rc)
            ? (rc >= 1 && rc <= 4 ? rc - 1 : rc)
            : 0
          const dificultad = (String(p.dificultad || 'media').toLowerCase() as any)
          const dificultadNorm = ['facil', 'media', 'dificil'].includes(dificultad) ? dificultad : 'media'
          return {
            pregunta: String(p.pregunta || ''),
            opciones: p.opciones.map(o => String(o)),
            respuestaCorrecta: Math.max(0, Math.min(3, rcFixed || 0)),
            explicacion: ensureCronLegalHeader(String(p.explicacion || ''), baseText),
            dificultad: dificultadNorm
          } as PreguntaGenerada
        })

      // Validar calidad y, si falla, reintentar con notas.
      const issuesByIndex: string[] = []
      const maxToCheck = Math.min(sanitized.length, numPreguntas)
      for (let i = 0; i < maxToCheck; i++) {
        const v = validatePreguntaCron(sanitized[i])
        if (!v.ok) issuesByIndex.push(`P${i + 1}: ${v.issues.slice(0, 3).join(', ')}`)
      }

      if (sanitized.length < numPreguntas || issuesByIndex.length > 0) {
        strictNotes =
          `\n\n⚠️ REINTENTO ${attempt + 1}: Corrige estos fallos y reescribe TODO el JSON:` +
          `\n- ${issuesByIndex.slice(0, 10).join('\n- ')}` +
          `\n\nRecuerda: explicación >=220 caracteres, empieza por "Fundamento:", incluye Artículo y Ley/RDL/RD, y justifica 2 opciones incorrectas.`
        continue
      }

      return sanitized.slice(0, numPreguntas)
    }

    return []
    
  } catch (error) {
    console.error(`Error generando preguntas para tema ${temaNumero}:`, error)
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const normalizeSecret = (value: string | null | undefined) =>
      String(value ?? '')
        // Vercel envs pulled from CLI sometimes include a literal "\\n" suffix.
        .replace(/\\n/g, '')
        .trim()

    // Verificar autenticación por token secreto (Vercel Cron envía header específico)
    const authHeader = req.headers.get('authorization')
    const cronSecret = normalizeSecret(process.env.CRON_SECRET)
    
    // Vercel Cron Jobs también puede verificarse por el header específico
    const vercelCronHeader = req.headers.get('x-vercel-cron')

    // Aceptar tanto el header de Vercel Cron como autenticación manual
    const isVercelCron = vercelCronHeader === '1'
    const authToken = normalizeSecret(authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '')
    const isValidManualAuth = !!cronSecret && !!authToken && authToken === cronSecret

    // Si es Vercel Cron, no obligamos a tener CRON_SECRET configurado.
    if (!isVercelCron && !cronSecret) {
      console.error('[Cron] CRON_SECRET no configurado para auth manual')
      return NextResponse.json({ error: 'Configuración incompleta (CRON_SECRET)' }, { status: 500 })
    }

    if (!isVercelCron && !isValidManualAuth) {
      console.error('[Cron] Token inválido o no es Vercel Cron', {
        hasAuthHeader: !!authHeader,
        cronSecretLen: cronSecret.length,
        authTokenLen: authToken.length,
        isVercelCron,
      })
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('[Cron] ✓ Autenticación exitosa')

    // Verificar Groq API Key
    if (!String(process.env.GROQ_API_KEY ?? '').trim()) {
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
      await recordCronHeartbeat({
        job: 'generate-questions',
        success: true,
        totalQuestions: 0,
        themesProcessed: 0,
        details: {
          message: 'Todos los temas tienen suficientes preguntas',
          temasConPreguntas: temasConPreguntas.length
        }
      })
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

      const preguntasRebalanceadas = rebalancePreguntasPorIndice(preguntas, 2)

      if (preguntasRebalanceadas.length > 0) {
        // Crear cuestionario para estas preguntas
        const questionnaire = await prisma.questionnaire.create({
          data: {
            title: `${tema.categoria === 'general' ? 'General' : 'Específico'} - Tema ${tema.numero} (Cron ${new Date().toLocaleDateString()})`,
            type: 'theory',
            published: false // No publicar automáticamente
          }
        })

        // Insertar preguntas
        for (const p of preguntasRebalanceadas) {
          await prisma.question.create({
            data: {
              questionnaireId: questionnaire.id,
              text: p.pregunta,
              options: JSON.stringify(p.opciones),
              correctAnswer: ['A', 'B', 'C', 'D'][p.respuestaCorrecta] || 'A',
              explanation: p.explicacion,
              difficulty: p.dificultad,
              temaCodigo: tema.id.toUpperCase(),
              temaNumero: tema.numero,
              temaParte: tema.categoria === 'general' ? 'GENERAL' : 'ESPECÍFICO',
              temaTitulo: tema.titulo
            }
          })
        }

        totalGeneradas += preguntasRebalanceadas.length
        resultados.push({
          tema: `${tema.numero} - ${tema.titulo}`,
          preguntas: preguntasRebalanceadas.length
        })

        console.log(`[Cron] ✓ Creadas ${preguntasRebalanceadas.length} preguntas para tema ${tema.numero}`)
      }

      // Pequeña pausa entre temas
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    await recordCronHeartbeat({
      job: 'generate-questions',
      success: true,
      totalQuestions: totalGeneradas,
      themesProcessed: temasPendientes.length,
      details: {
        temasPendientes: temasPendientes.map(t => ({ id: t.id, numero: t.numero, titulo: t.titulo })),
        resultados
      }
    })

    return NextResponse.json({
      success: true,
      message: `Generación automática completada`,
      totalPreguntas: totalGeneradas,
      temasProcesados: temasPendientes.length,
      detalles: resultados
    })

  } catch (error) {
    console.error('[Cron] Error:', error)
    await recordCronHeartbeat({
      job: 'generate-questions',
      success: false,
      totalQuestions: 0,
      themesProcessed: 0,
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json({ 
      error: 'Error en generación automática',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
