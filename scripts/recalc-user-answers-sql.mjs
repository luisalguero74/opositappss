#!/usr/bin/env node

import pg from 'pg'

const { Client } = pg

function parseArgs(argv) {
  const args = {
    apply: false,
    batchSize: 500,
    userId: null,
    limit: null
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--dry-run') args.apply = false
    else if (a === '--userId') args.userId = argv[++i] ?? null
    else if (a === '--batchSize') args.batchSize = Number.parseInt(argv[++i] ?? '500', 10)
    else if (a === '--limit') args.limit = Number.parseInt(argv[++i] ?? '0', 10)
  }

  if (!Number.isFinite(args.batchSize) || args.batchSize < 50) args.batchSize = 500
  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = null
  return args
}

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

async function getColumns(client, tableName) {
  const res = await client.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,
    [tableName]
  )
  return res.rows.map(r => r.column_name)
}

async function main() {
  const { apply, batchSize, userId, limit } = parseArgs(process.argv.slice(2))

  const url = process.env.DATABASE_URL
  if (!url || !String(url).trim()) {
    throw new Error('DATABASE_URL is not set in this terminal session')
  }

  console.log(`[recalc-user-answers-sql] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}${userId ? ` | userId=${userId}` : ''}${limit ? ` | limit=${limit}` : ''} | batchSize=${batchSize}`)

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  })
  await client.connect()

  try {
    const uaCols = await getColumns(client, 'UserAnswer')
    const qCols = await getColumns(client, 'Question')

    const uaAnswerCol = uaCols.includes('answer') ? 'answer' : (uaCols.includes('selectedAnswer') ? 'selectedAnswer' : null)
    if (!uaAnswerCol) {
      throw new Error(`Could not find answer column in public.UserAnswer. Columns: ${uaCols.join(', ')}`)
    }
    if (!uaCols.includes('isCorrect')) {
      throw new Error('public.UserAnswer.isCorrect column not found')
    }
    if (!uaCols.includes('questionId')) {
      throw new Error('public.UserAnswer.questionId column not found')
    }
    if (!qCols.includes('correctAnswer') || !qCols.includes('options')) {
      throw new Error(`public.Question missing required columns. Columns: ${qCols.join(', ')}`)
    }

    let scanned = 0
    let wouldChange = 0
    let changed = 0
    let cursor = null

    while (true) {
      const where = []
      const params = []
      let p = 1

      if (userId) {
        where.push(`ua."userId" = $${p++}`)
        params.push(userId)
      }
      if (cursor) {
        where.push(`ua.id > $${p++}`)
        params.push(cursor)
      }

      const whereSql = where.length ? `where ${where.join(' and ')}` : ''
      const sql = `
        select ua.id, ua."${uaAnswerCol}" as answer_value, ua."isCorrect" as is_correct, q.options as q_options, q."correctAnswer" as q_correct
        from "UserAnswer" ua
        join "Question" q on q.id = ua."questionId"
        ${whereSql}
        order by ua.id asc
        limit ${Number(batchSize)}
      `

      const res = await client.query(sql, params)
      const rows = res.rows
      if (!rows.length) break

      for (const row of rows) {
        scanned++
        const options = safeParseOptions(row.q_options)
        const correctLetter = getCorrectAnswerLetter(row.q_correct, options)
        const selectedLetter = normalizeSelectedAnswerToLetter(row.answer_value, options)
        const newIsCorrect = Boolean(selectedLetter && correctLetter && selectedLetter === correctLetter)

        if (row.is_correct !== newIsCorrect) {
          wouldChange++
          if (apply) {
            await client.query('update "UserAnswer" set "isCorrect"=$1 where id=$2', [newIsCorrect, row.id])
            changed++
          }
        }

        cursor = row.id
        if (limit && scanned >= limit) break
      }

      if (limit && scanned >= limit) break

      if (scanned % (batchSize * 5) === 0) {
        console.log(`[recalc-user-answers-sql] scanned=${scanned} wouldChange=${wouldChange}${apply ? ` changed=${changed}` : ''}`)
      }
    }

    console.log(`[recalc-user-answers-sql] DONE scanned=${scanned} wouldChange=${wouldChange}${apply ? ` changed=${changed}` : ''}`)
    if (!apply) {
      console.log('[recalc-user-answers-sql] Dry-run only. Re-run with --apply to write changes.')
    }
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((err) => {
  console.error('[recalc-user-answers-sql] ERROR', err)
  process.exitCode = 1
})
