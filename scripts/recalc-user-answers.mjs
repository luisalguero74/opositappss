#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs'

function parseEnv(text) {
  const out = {}
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    let value = t.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) return

  const files = ['.env.vercel.production', '.env.production.local', '.env.production', '.env.local', '.env']
  const keys = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL']

  for (const file of files) {
    try {
      if (!existsSync(file)) continue
      const env = parseEnv(readFileSync(file, 'utf8'))
      for (const key of keys) {
        const value = env[key]
        if (typeof value === 'string' && value.trim()) {
          process.env.DATABASE_URL = value.trim()
          console.log(`[recalc-user-answers] Using DATABASE_URL from ${file} (${key})`)
          return
        }
      }
    } catch {
      // ignore
    }
  }

  throw new Error('DATABASE_URL is not set and could not be loaded from env files')
}

ensureDatabaseUrl()

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

function safeParseOptions(options) {
  if (Array.isArray(options)) return options.map(String)
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

function normalizeLetter(value) {
  const v = String(value ?? '').trim().toLowerCase()
  return ['a', 'b', 'c', 'd'].includes(v) ? v : null
}

function letterFromIndex(index) {
  if (index < 0 || index > 3) return null
  return String.fromCharCode(97 + index)
}

function getCorrectAnswerLetter(correctAnswer, options) {
  const asLetter = normalizeLetter(correctAnswer)
  if (asLetter) return asLetter

  const raw = String(correctAnswer ?? '').trim()
  if (!raw) return null

  const idx = options.findIndex(opt => opt === raw)
  return letterFromIndex(idx)
}

function normalizeSelectedAnswerToLetter(selectedAnswer, options) {
  const asLetter = normalizeLetter(selectedAnswer)
  if (asLetter) return asLetter

  const raw = String(selectedAnswer ?? '').trim()
  if (!raw) return null

  const idx = options.findIndex(opt => opt === raw)
  return letterFromIndex(idx)
}

function parseArgs(argv) {
  const args = {
    userId: null,
    apply: false,
    batchSize: 500
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--dry-run') args.apply = false
    else if (a === '--userId') args.userId = argv[++i] ?? null
    else if (a === '--batchSize') args.batchSize = Number.parseInt(argv[++i] ?? '500', 10)
  }

  if (!Number.isFinite(args.batchSize) || args.batchSize < 50) args.batchSize = 500
  return args
}

async function main() {
  const { userId, apply, batchSize } = parseArgs(process.argv.slice(2))

  console.log(`[recalc-user-answers] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}${userId ? ` | userId=${userId}` : ''} | batchSize=${batchSize}`)

  let cursor = undefined
  let scanned = 0
  let wouldChange = 0
  let changed = 0

  while (true) {
    const rows = await prisma.userAnswer.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        answer: true,
        isCorrect: true,
        question: { select: { options: true, correctAnswer: true } }
      }
    })

    if (rows.length === 0) break

    for (const ua of rows) {
      scanned++
      const options = safeParseOptions(ua.question?.options)
      const correctLetter = getCorrectAnswerLetter(ua.question?.correctAnswer, options)
      const selectedLetter = normalizeSelectedAnswerToLetter(ua.answer, options)
      const newIsCorrect = Boolean(selectedLetter && correctLetter && selectedLetter === correctLetter)

      if (ua.isCorrect !== newIsCorrect) {
        wouldChange++
        if (apply) {
          await prisma.userAnswer.update({
            where: { id: ua.id },
            data: { isCorrect: newIsCorrect }
          })
          changed++
        }
      }
    }

    cursor = rows[rows.length - 1].id

    if (scanned % (batchSize * 5) === 0) {
      console.log(`[recalc-user-answers] scanned=${scanned} wouldChange=${wouldChange}${apply ? ` changed=${changed}` : ''}`)
    }
  }

  console.log(`[recalc-user-answers] DONE scanned=${scanned} wouldChange=${wouldChange}${apply ? ` changed=${changed}` : ''}`)
  if (!apply) {
    console.log('[recalc-user-answers] Dry-run only. Re-run with --apply to write changes.')
  }
}

main()
  .catch((err) => {
    console.error('[recalc-user-answers] ERROR', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
