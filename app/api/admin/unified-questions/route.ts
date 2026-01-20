import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeTemaCodigo } from '@/lib/tema-codigo'
import { TEMARIO_OFICIAL } from '@/lib/temario-oficial'

/**
 * API unificada que carga preguntas de múltiples fuentes
 * Combina: Question (manuales) + GeneratedQuestion (IA aprobadas)
 * Clasificadas por tema automáticamente
 */
export async function GET(req: NextRequest) {
  let step = 'init'
  let isAuthorized = false
  try {
    step = 'get-session'
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

    isAuthorized = true

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '500')
    const filterTema = searchParams.get('tema')
    const filterType = searchParams.get('type') // 'manual' | 'ai' | 'all'

    const parseTemaCodigo = (input?: string | null) => {
      const normalized = input ? normalizeTemaCodigo(input) : null
      if (!normalized) return null

      const match = normalized.match(/^([GE])(\d{2})$/)
      if (!match) return null

      const letter = match[1]
      const numero = Number.parseInt(match[2], 10)
      if (!Number.isFinite(numero)) return null

      const categoria = letter === 'G' ? 'general' : 'especifico'
      const temaId = `${categoria === 'general' ? 'g' : 'e'}${numero}`
      return { codigo: normalized, categoria, numero, temaId }
    }

    const safeParseOptions = (raw: unknown): string[] => {
      if (Array.isArray(raw)) {
        return raw.filter((x): x is string => typeof x === 'string')
      }

      if (typeof raw !== 'string') return []

      const trimmed = raw.trim()
      if (!trimmed) return []

      try {
        const parsed = JSON.parse(trimmed)
        if (!Array.isArray(parsed)) return []
        return parsed.filter((x): x is string => typeof x === 'string')
      } catch {
        return []
      }
    }

    // 1. Cargar preguntas manuales (Question) - vinculadas a cuestionarios publicados
    step = 'load-manual-questions'
    const manualQuestions = await prisma.question.findMany({
      take: limit,
      where: {
        questionnaire: {
          published: true
        },
        ...(filterTema && { temaCodigo: filterTema })
      }
    })

    // 2. Cargar preguntas generadas por IA (GeneratedQuestion)
    step = 'load-ai-questions'
    const aiQuestions = await prisma.generatedQuestion.findMany({
      take: limit,
      where: {
        approved: true,
        ...(filterTema && { topic: filterTema })
      }
    })

    // 2.1 Cargar temario oficial (para filtros por general/específico)
    // Nota: en algunos entornos el temario puede no estar seed-eado en BD;
    // en ese caso usamos el temario en código como fallback para que la UI siempre tenga opciones.
    step = 'load-temario'
    let temasOficialesDb: Array<{ id: string; numero: number; titulo: string; categoria: string }> = []
    let temarioSource: 'db' | 'code' | 'db-error' = 'db'
    try {
      temasOficialesDb = await prisma.temaOficial.findMany({
        select: {
          id: true,
          numero: true,
          titulo: true,
          categoria: true
        },
        orderBy: [{ categoria: 'asc' }, { numero: 'asc' }]
      })
    } catch (e) {
      temarioSource = 'db-error'
      temasOficialesDb = []
    }

    // Construir lista de temas oficiales priorizando el temario completo en código
    // y complementando con lo que exista en BD. Así evitamos que una semilla
    // incompleta en la BD o futuros temarios parciales oculten temas en la UI.
    const temasFromCode = TEMARIO_OFICIAL
      .map(t => ({ id: t.id, numero: t.numero, titulo: t.titulo, categoria: t.categoria }))
	  .sort((a, b) => {
	    const ca = a.categoria === 'general' ? 0 : 1
	    const cb = b.categoria === 'general' ? 0 : 1
	    if (ca !== cb) return ca - cb
	    return a.numero - b.numero
	  })

    let temasOficiales: Array<{ id: string; numero: number; titulo: string; categoria: string }>

    if (!temasOficialesDb.length) {
      // Sin datos en BD: usar siempre el temario oficial en código
      if (temarioSource === 'db') temarioSource = 'code'
      temasOficiales = temasFromCode
    } else {
      // Con datos en BD: combinar ambos orígenes.
      // - Partimos del temario en código (lista completa)
      // - Sobrescribimos con registros de BD cuando coincida el id
      // - Añadimos cualquier tema extra que pudiera existir solo en BD
      temarioSource = temarioSource === 'db-error' ? 'db-error' : 'db+code'

      const byId = new Map<string, { id: string; numero: number; titulo: string; categoria: string }>()

      for (const t of temasFromCode) {
        byId.set(t.id, { ...t })
      }

      for (const t of temasOficialesDb) {
        const existing = byId.get(t.id)
        if (existing) {
          byId.set(t.id, {
            ...existing,
            numero: t.numero ?? existing.numero,
            titulo: t.titulo ?? existing.titulo,
            categoria: t.categoria || existing.categoria
          })
        } else {
          byId.set(t.id, {
            id: t.id,
            numero: t.numero,
            titulo: t.titulo,
            categoria: t.categoria
          })
        }
      }

      temasOficiales = Array.from(byId.values()).sort((a, b) => {
        const ca = a.categoria === 'general' ? 0 : 1
        const cb = b.categoria === 'general' ? 0 : 1
        if (ca !== cb) return ca - cb
        return a.numero - b.numero
      })
    }

    const temasOficialById = new Map(temasOficiales.map(t => [t.id, t]))

    // 3. Combinar y normalizar
    step = 'combine-and-normalize'
    let optionsParseIssues = 0
    const combinedQuestions = [
      ...manualQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: (() => {
          const parsed = safeParseOptions(q.options)
          if (parsed.length === 0) optionsParseIssues += 1
          return parsed
        })(),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'media',
        tema: q.temaTitulo || q.temaCodigo || 'Sin tema',
        temaCodigo: q.temaCodigo,
        temaNormalized: parseTemaCodigo(q.temaCodigo),
        source: 'manual' as const
      })),
      ...aiQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: (() => {
          const parsed = safeParseOptions(q.options)
          if (parsed.length === 0) optionsParseIssues += 1
          return parsed
        })(),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'media',
        tema: q.topic || 'Sin tema',
        temaCodigo: q.topic,
        temaNormalized: parseTemaCodigo(q.topic),
        source: 'ai' as const
      }))
    ]

    // 4. Filtrar duplicados (comparar texto)
    step = 'dedupe'
    const seen = new Set<string>()
    const uniqueQuestions = combinedQuestions.filter(q => {
      const key = `${q.text}|${q.correctAnswer}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    step = 'attach-tema-metadata'
    const uniqueQuestionsWithTema = uniqueQuestions.map(q => {
      const temaOficialId = q.temaNormalized?.temaId ?? null
      const temaOficial = temaOficialId ? temasOficialById.get(temaOficialId) : null

      return {
        ...q,
        temaOficialId: temaOficial?.id ?? null,
        temarioCategoria: (temaOficial?.categoria as 'general' | 'especifico' | null) ?? null,
        temaNumero: temaOficial?.numero ?? null,
        temaTitulo: temaOficial?.titulo ?? null
      }
    })

    // 5. Obtener temas únicos para filtros
    step = 'build-temas'
    const temas = Array.from(new Set(uniqueQuestionsWithTema.map(q => q.tema).filter(Boolean))) as string[]

    // 6. Construir opciones de tema oficial con recuento (para filtros UI)
    step = 'build-temas-oficiales'
    const countsByTemaId = new Map<string, number>()
    for (const q of uniqueQuestionsWithTema) {
      if (!q.temaOficialId) continue
      countsByTemaId.set(q.temaOficialId, (countsByTemaId.get(q.temaOficialId) ?? 0) + 1)
    }

    const temasOficialesConConteo = temasOficiales.map(t => {
      const letter = t.categoria === 'general' ? 'G' : 'E'
      const codigo = `${letter}${String(t.numero).padStart(2, '0')}`
      return {
        id: t.id,
        categoria: t.categoria as 'general' | 'especifico',
        numero: t.numero,
        codigo,
        titulo: t.titulo,
        count: countsByTemaId.get(t.id) ?? 0
      }
    })

    const temasOficialesPorTemario = {
      general: temasOficialesConConteo.filter(t => t.categoria === 'general'),
      especifico: temasOficialesConConteo.filter(t => t.categoria === 'especifico')
    }

    step = 'respond'
    return NextResponse.json({
      success: true,
      questions: uniqueQuestionsWithTema.map(({ temaNormalized, ...rest }) => rest),
      temas,
      temasOficiales: temasOficialesConConteo,
      temasOficialesPorTemario,
      temarioSource,
      diagnostics: {
        optionsParseIssues
      },
      total: uniqueQuestions.length,
      summary: {
        manual: manualQuestions.length,
        ai: aiQuestions.length,
        duplicateRemoved: combinedQuestions.length - uniqueQuestions.length
      }
    })
  } catch (error) {
    console.error('Error en API unificada de preguntas:', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      isAuthorized
        ? { error: 'Error al cargar preguntas', step, details }
        : { error: 'Error al cargar preguntas' },
      { status: 500 }
    )
  }
}
