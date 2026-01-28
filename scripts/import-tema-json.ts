import { prisma } from '../src/lib/prisma'
import { readFile } from 'fs/promises'
import path from 'path'
import { TEMARIO_GENERAL, TEMARIO_ESPECIFICO } from '../src/lib/temario'

interface TemaBlock {
  questionnaireId?: string
  questionCount?: number
  temaCodigo?: string
  temaNumero?: number
  temaParte?: string
  temaTitulo?: string
  difficulty?: string
  questions?: TemaQuestion[]
}

interface TemaQuestion {
  // Algunos JSON usan "text" y otros "question" como enunciado
  text?: string
  question?: string
  // "options" puede venir como array o como string JSONificado
  options?: string[] | string
  // En algunos JSON es la letra (A/B/C/D) y en otros el texto completo
  correctAnswer?: string
  explanation?: string
  difficulty?: string
  temaCodigo?: string
  temaNumero?: number
  temaParte?: string
  temaTitulo?: string
}

function sanitize(value: unknown): string {
  if (value == null) return ''
  // Eliminar bytes nulos ("\u0000") que Postgres no admite en campos de texto
  return String(value).replace(/\u0000/g, '')
}

function mapDifficulty(input?: string): string | null {
  if (!input) return null
  const v = input.toLowerCase().trim()
  if (v === 'easy' || v === 'facil' || v === 'baja') return 'facil'
  if (v === 'medium' || v === 'media' || v === 'intermedia' || v === 'media-alta') return 'media'
  if (v === 'hard' || v === 'dificil' || v === 'difícil' || v === 'alta' || v === 'muy alta') return 'dificil'
  return null
}

function inferTemaCodigo(especifico: boolean, numero?: number | null, override?: string | null): string | null {
  if (override && override.trim()) return override.trim().toUpperCase()
  if (!numero || !Number.isFinite(numero)) return null
  const letter = especifico ? 'E' : 'G'
  return `${letter}${String(numero).padStart(2, '0')}`
}

function getOfficialTemaCode(especifico: boolean, numero: number | null): string | null {
  if (!numero || !Number.isFinite(numero)) return null
  const lista = especifico ? TEMARIO_ESPECIFICO : TEMARIO_GENERAL
  const found = lista.find(t => t.numero === numero)
  return found?.codigo ?? null
}

export async function importTemaFromJson(rawFilePath: string, rawTemaCodigo?: string | null) {
  const filePath = path.resolve(process.cwd(), rawFilePath)
  const temaCodigoOverride = rawTemaCodigo ? rawTemaCodigo.trim().toUpperCase() : null

  console.log('📄 Archivo JSON:', filePath)
  if (temaCodigoOverride) {
    console.log('🔖 temaCodigo forzado:', temaCodigoOverride)
  }

  const raw = await readFile(filePath, 'utf8')
  const root = JSON.parse(raw)

  const blocks: TemaBlock[] = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root)
      ? root
      : [root]

  if (blocks.length === 0) {
    const msg = 'El JSON no contiene bloques en data ni preguntas.'
    console.error('❌', msg)
    throw new Error(msg)
  }

  const block = blocks[0]
  const questions = Array.isArray(block.questions) ? block.questions : []

  if (questions.length === 0) {
    const msg = 'El bloque principal no contiene preguntas (questions[] vacío).'
    console.error('❌', msg)
    throw new Error(msg)
  }

  let temaNumero: number | null = block.temaNumero ?? questions[0]?.temaNumero ?? null
  const temaParte = (block.temaParte ?? questions[0]?.temaParte ?? '').toString()
  const temaTitulo = block.temaTitulo ?? questions[0]?.temaTitulo ?? path.basename(filePath)
  const especifico = temaParte.toUpperCase().includes('ESPEC')

  const temaCodigoDetectado = block.temaCodigo ?? questions[0]?.temaCodigo ?? null

  // Intentamos mapear primero al código oficial del temario (E02, G03, ...)
  const officialCode = getOfficialTemaCode(especifico, temaNumero)

  const temaCodigo = inferTemaCodigo(
    especifico,
    temaNumero,
    temaCodigoOverride || officialCode || temaCodigoDetectado,
  )

  // Si no tenemos temaNumero pero sí un código tipo E03/G02, lo inferimos de ahí
  if (!temaNumero && temaCodigo) {
    const m = temaCodigo.match(/^[A-Z](\d{2})$/)
    if (m) {
      temaNumero = parseInt(m[1], 10)
    }
  }

  console.log('📌 Metadatos detectados:')
  console.log('   · temaNumero:', temaNumero)
  console.log('   · temaParte :', temaParte || '(no definido)')
  console.log('   · temaTitulo:', temaTitulo)
  console.log('   · temaCodigo:', temaCodigo || '(no definido)')

  const questionnaireId = block.questionnaireId
    || `tema-${temaCodigo || 'sin-codigo'}-${Date.now()}`

  console.log('\n🧪 Resumen de preguntas en JSON:')
  console.log('   · Total preguntas:', questions.length)

  // Comprobación rápida de estructura (solo a efectos de log, no bloqueante)
  let missingFields = 0
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const hasText = Boolean(q.text || q.question)
    const hasOptions = Array.isArray(q.options) || typeof q.options === 'string'
    const hasCorrect = typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0
    if (!hasText || !hasOptions || !hasCorrect) {
      console.log(`   ⚠️ Pregunta #${i + 1} con estructura incompleta`)
      missingFields++
    }
  }

  if (missingFields > 0) {
    console.log(`\n⚠️ Detectadas ${missingFields} preguntas con estructura potencialmente incompleta. Revisa el JSON si algo falla.`)
  }

  console.log('\n🚀 Preparando importación en base de datos...')

  // Buscar o crear Questionnaire
  const title = temaTitulo
  const existingQuestionnaire = await prisma.questionnaire.findUnique({
    where: { id: questionnaireId }
  }).catch(() => null)

  let questionnaire
  if (existingQuestionnaire) {
    console.log('   · Cuestionario existente encontrado con id:', questionnaireId)
    // Asegurar que está publicado y con título coherente
    if (!existingQuestionnaire.published || existingQuestionnaire.title !== title) {
      questionnaire = await prisma.questionnaire.update({
        where: { id: questionnaireId },
        data: {
          published: true,
          title
        }
      })
    } else {
      questionnaire = existingQuestionnaire
    }
  } else {
    console.log('   · Creando nuevo cuestionario con id:', questionnaireId)
    questionnaire = await prisma.questionnaire.create({
      data: {
        id: questionnaireId,
        title,
        type: 'theory',
        published: true
      }
    })
  }

  let created = 0
  let skipped = 0

  for (const q of questions) {
    const baseText = sanitize((q.text || q.question || '').toString()).trim()

    // Normalizamos opciones: pueden venir como array o como string JSON
    let optionsArray: string[] | null = null
    if (Array.isArray(q.options)) {
      optionsArray = q.options.map(o => sanitize(o))
    } else if (typeof q.options === 'string') {
      try {
        const parsed = JSON.parse(q.options)
        if (Array.isArray(parsed)) {
          optionsArray = parsed.map(o => sanitize(o))
        }
      } catch {
        // formato no válido, se tratará como pregunta inválida más abajo
      }
    }

    let correct: 'A' | 'B' | 'C' | 'D' | null = null
    const rawCorrect = sanitize(q.correctAnswer || '').trim()
    const upper = rawCorrect.toUpperCase()
    if (['A', 'B', 'C', 'D'].includes(upper)) {
      correct = upper as 'A' | 'B' | 'C' | 'D'
    } else if (optionsArray && rawCorrect) {
      // Si el JSON trae como respuesta el texto completo, buscamos su índice
      const idx = optionsArray.findIndex(o => o === rawCorrect)
      if (idx >= 0 && idx < 4) {
        correct = 'ABCD'[idx] as 'A' | 'B' | 'C' | 'D'
      }
    }

    if (!baseText || !optionsArray || optionsArray.length !== 4 || !correct) {
      skipped++
      continue
    }

    const existing = await prisma.question.findFirst({
      where: {
        questionnaireId: questionnaire.id,
        text: baseText,
        correctAnswer: correct
      }
    })

    if (existing) {
      // Actualizar metadatos de temario/dificultad si están ausentes o desajustados
      const difficulty = mapDifficulty(q.difficulty ?? block.difficulty)
      const patch: any = {}

      if (temaCodigo && existing.temaCodigo !== temaCodigo) {
        patch.temaCodigo = temaCodigo
      }
      if (temaNumero && existing.temaNumero !== temaNumero) {
        patch.temaNumero = temaNumero
      }
      if (temaParte && existing.temaParte !== temaParte) {
        patch.temaParte = temaParte
      }
      if (temaTitulo && existing.temaTitulo !== temaTitulo) {
        patch.temaTitulo = temaTitulo
      }
      if (difficulty && existing.difficulty !== difficulty) {
        patch.difficulty = difficulty
      }
      if (Object.keys(patch).length > 0) {
        await prisma.question.update({
          where: { id: existing.id },
          data: patch
        })
      }
      skipped++
      continue
    }

    const difficulty = mapDifficulty(q.difficulty ?? block.difficulty)

    await prisma.question.create({
      data: {
        questionnaireId: questionnaire.id,
        text: baseText,
        options: JSON.stringify(optionsArray),
        correctAnswer: correct,
        explanation: sanitize(q.explanation ?? ''),
        temaCodigo: temaCodigo ?? undefined,
        temaNumero: temaNumero ?? undefined,
        temaParte: temaParte || undefined,
        temaTitulo: temaTitulo || undefined,
        difficulty: difficulty ?? undefined,
        aiReviewed: false
      }
    })
    created++
  }

  console.log('\n✅ Importación completada:')
  console.log('   · Preguntas creadas :', created)
  console.log('   · Preguntas omitidas:', skipped)
  return { created, skipped }
}

async function main() {
  const [,, rawFilePath, rawTemaCodigo] = process.argv

  if (!rawFilePath) {
    console.error('Uso: npx tsx scripts/import-tema-json.ts <ruta-json> [temaCodigo]')
    process.exit(1)
  }

  try {
    await importTemaFromJson(rawFilePath, rawTemaCodigo ?? null)
  } catch (err) {
    console.error('❌ Error durante la importación de tema JSON:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

if (require.main === module) {
  // Solo ejecutamos main() cuando se llama como script CLI
  // (no cuando se importa desde otros scripts TS)
  main()
}
