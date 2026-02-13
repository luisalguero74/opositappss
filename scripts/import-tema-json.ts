import { readFile } from 'fs/promises'
import path from 'path'

import { prisma } from '@/lib/prisma'
import { normalizeCorrectAnswerToUpperLetter, safeParseOptions } from '@/lib/answer-normalization'

type ImportTemaOptions = {
  markReviewed?: boolean
}

function sanitizeText(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/\u0000/g, '')
}

function toNullableString(value: unknown): string | null {
  const v = sanitizeText(value).trim()
  return v ? v : null
}

function normalizeTemaParte(value: unknown): string | null {
  const raw = sanitizeText(value).trim()
  if (!raw) return null

  const normalized = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.startsWith('GEN')) return 'GENERAL'
  if (normalized.startsWith('ESP')) return 'ESPECÍFICO'
  return raw
}

function mapDifficulty(value: unknown): string | null {
  if (value == null) return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 1) return 'facil'
    if (value >= 3) return 'dificil'
    return 'media'
  }

  const raw = sanitizeText(value).trim().toLowerCase()
  if (!raw) return null

  if (raw.includes('fac') || raw.includes('easy') || raw.includes('baja')) return 'facil'
  if (raw.includes('dif') || raw.includes('hard') || raw.includes('alta')) return 'dificil'
  if (raw.includes('med') || raw.includes('normal')) return 'media'

  return raw
}

function inferTemaCodigo(temaCodigo: unknown, temaNumero: unknown, temaParte: unknown): string | null {
  const explicit = toNullableString(temaCodigo)
  if (explicit) return explicit

  const num = typeof temaNumero === 'number' ? temaNumero : parseInt(sanitizeText(temaNumero), 10)
  if (!Number.isFinite(num) || num <= 0) return null

  const parte = sanitizeText(temaParte).trim().toLowerCase()
  const prefix = parte.startsWith('gen') || parte.includes('general') ? 'G' : parte.startsWith('esp') || parte.includes('espec') ? 'E' : null
  if (!prefix) return null

  return `${prefix}${num}`
}

function normalizeBlocks(root: any): any[] {
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (root && typeof root === 'object') return [root]
  return []
}

function inferQuestionnaireMeta(block: any, jsonPath: string): { id: string | null; title: string; type: string } {
  const explicitId = toNullableString(block?.questionnaireId)
  const temaTitulo = toNullableString(block?.temaTitulo)
  const temaNumero = block?.temaNumero
  const temaParte = block?.temaParte
  const temaCodigo = inferTemaCodigo(block?.temaCodigo, temaNumero, temaParte)

  const basename = path.basename(jsonPath, path.extname(jsonPath))
  const id = explicitId ?? null

  let title = `Importado - ${basename}`
  if (temaTitulo) {
    title = `Test - ${temaTitulo}`
  } else if (temaCodigo) {
    title = `Test ${temaCodigo}${temaNumero ? ` - Tema ${temaNumero}` : ''}`
  }

  const lowerTitle = title.toLowerCase()
  const type = lowerTitle.includes('práctic') || lowerTitle.includes('practic') || lowerTitle.includes('supuesto') ? 'practical' : 'theory'

  return { id, title, type }
}

export async function importTemaFromJson(
  jsonPath: string,
  questionnaireId: string | null = null,
  opts: ImportTemaOptions = {},
): Promise<{ created: number; skipped: number; questionnaireId: string }>
{
  const content = await readFile(jsonPath, 'utf-8')
  const parsed = JSON.parse(content)
  const blocks = normalizeBlocks(parsed)
  if (blocks.length === 0) {
    throw new Error('JSON inválido: se esperaba root.data[], un array o un objeto')
  }

  let created = 0
  let skipped = 0
  let lastQuestionnaireId: string | null = null

  for (const block of blocks) {
    const meta = inferQuestionnaireMeta(block, jsonPath)
    const blockQuestions: any[] = Array.isArray(block?.questions) ? block.questions : []
    if (blockQuestions.length === 0) {
      throw new Error('Bloque inválido: questions[] vacío')
    }

    let questionnaireDbId: string

    const desiredId = questionnaireId ?? meta.id
    if (desiredId) {
      const existing = await prisma.questionnaire.findUnique({ where: { id: desiredId } })
      if (existing) {
        await prisma.questionnaire.update({
          where: { id: desiredId },
          data: {
            title: meta.title,
            type: meta.type,
            published: true,
          },
        })
        questionnaireDbId = desiredId
      } else {
        const createdQ = await prisma.questionnaire.create({
          data: {
            id: desiredId,
            title: meta.title,
            type: meta.type,
            published: true,
          },
        })
        questionnaireDbId = createdQ.id
      }
    } else {
      const createdQ = await prisma.questionnaire.create({
        data: {
          title: meta.title,
          type: meta.type,
          published: true,
        },
      })
      questionnaireDbId = createdQ.id
    }

    lastQuestionnaireId = questionnaireDbId

    let createdInThisBlock = 0
    for (const q of blockQuestions) {
      const text = sanitizeText(q?.text ?? q?.question).trim()
      if (!text) {
        skipped++
        continue
      }

      const optionsArray = safeParseOptions(q?.options)
        .map((opt) => sanitizeText(opt).trim())
        .filter(Boolean)
      if (optionsArray.length !== 4) {
        skipped++
        continue
      }

      const correct = normalizeCorrectAnswerToUpperLetter(q?.correctAnswer, optionsArray)
      if (!correct) {
        skipped++
        continue
      }

      const temaNumero = q?.temaNumero ?? block?.temaNumero ?? null
      const temaParte = normalizeTemaParte(q?.temaParte ?? block?.temaParte)
      const temaTitulo = toNullableString(q?.temaTitulo ?? block?.temaTitulo)
      const difficulty = mapDifficulty(q?.difficulty ?? block?.difficulty)
      const temaCodigo = inferTemaCodigo(q?.temaCodigo ?? block?.temaCodigo, temaNumero, temaParte)

      const explanation = sanitizeText(q?.explanation ?? '').trim()

      const exists = await prisma.question.findFirst({
        where: {
          questionnaireId: questionnaireDbId,
          text,
          correctAnswer: correct,
        },
      })
      if (exists) {
        skipped++
        continue
      }

      await prisma.question.create({
        data: {
          questionnaireId: questionnaireDbId,
          text,
          options: JSON.stringify(optionsArray),
          correctAnswer: correct,
          explanation,
          origin: 'JSON',
          reviewStatus: 'PENDING',
          temaCodigo,
          temaNumero: typeof temaNumero === 'number' ? temaNumero : Number.isFinite(parseInt(sanitizeText(temaNumero), 10)) ? parseInt(sanitizeText(temaNumero), 10) : null,
          temaParte,
          temaTitulo,
          difficulty,
          ...(opts.markReviewed ? { aiReviewed: true, aiReviewedAt: new Date() } : {}),
        },
      })
      created++
      createdInThisBlock++
    }

    if (createdInThisBlock > 0) {
      await prisma.questionnaire.update({
        where: { id: questionnaireDbId },
        data: { updatedAt: new Date() },
      })
    }
  }

  const bestEffortId = lastQuestionnaireId ?? questionnaireId ?? toNullableString(blocks[0]?.questionnaireId) ?? 'unknown'
  return { created, skipped, questionnaireId: bestEffortId }
}

// Optional CLI usage: npx tsx scripts/import-tema-json.ts <path>
// Guarded to avoid breaking Next.js bundling environments.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any

if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  ;(async () => {
    const input = process.argv[2]
    if (!input) {
      console.error('Uso: npx tsx scripts/import-tema-json.ts <ruta-al-json>')
      process.exit(1)
    }
    const result = await importTemaFromJson(input, null, { markReviewed: false })
    console.log(JSON.stringify(result, null, 2))
  })().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
