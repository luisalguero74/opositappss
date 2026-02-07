import { existsSync, readFileSync, writeFileSync } from 'node:fs'

type Args = {
  out: string
  limit: number
  samplesPerQuestionnaire: number
  urlEnv: string
}

const ENV_FILES = [
  '.env.vercel.production',
  '.env.vercel',
  '.env.production.vercel',
  '.env.production.local',
  '.env.production',
]

function stripQuotes(value: string): string {
  const v = value.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return v
}

function loadEnvFromFiles() {
  for (const file of ENV_FILES) {
    try {
      if (!existsSync(file)) continue
      const text = readFileSync(file, 'utf8')
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const idx = t.indexOf('=')
        if (idx === -1) continue
        const key = t.slice(0, idx).trim()
        if (!key) continue
        if (process.env[key] != null) continue
        const rawValue = t.slice(idx + 1)
        process.env[key] = stripQuotes(rawValue)
      }
    } catch {
      // ignore
    }
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    out: 'tema-metadata-manual-review.json',
    limit: 200,
    samplesPerQuestionnaire: 5,
    urlEnv: 'DATABASE_URL',
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--out') {
      const v = (argv[i + 1] ?? '').trim()
      if (v) args.out = v
      i++
    }
    if (a === '--limit') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n > 0) args.limit = n
      i++
    }
    if (a === '--samples-per-questionnaire') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n >= 0) args.samplesPerQuestionnaire = n
      i++
    }
    if (a === '--url-env') {
      const v = (argv[i + 1] ?? '').trim()
      if (v) args.urlEnv = v
      i++
    }
  }

  return args
}

function isMissing(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function snippet(text: string, max = 140): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + '…'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  loadEnvFromFiles()

  if (args.urlEnv !== 'DATABASE_URL') {
    const candidate = process.env[args.urlEnv]
    if (!candidate) throw new Error(`Env var not set: ${args.urlEnv}`)
    process.env.DATABASE_URL = candidate
  }

  const prismaModule = await import('../src/lib/prisma')
  const db = prismaModule.prisma

  console.log('🧾 Export tema metadata manual review (safe)')
  console.log(`   · out: ${args.out}`)
  console.log(`   · limit questionnaires: ${args.limit}`)
  console.log(`   · samples/questionnaire: ${args.samplesPerQuestionnaire}`)
  console.log(`   · urlEnv: ${args.urlEnv}`)

  const candidates = await db.question.findMany({
    where: {
      OR: [
        { temaCodigo: null },
        { temaCodigo: '' },
        { temaParte: null },
        { temaParte: '' },
        { temaTitulo: null },
        { temaTitulo: '' },
      ],
    },
    select: {
      id: true,
      questionnaireId: true,
      text: true,
      temaCodigo: true,
      temaNumero: true,
      temaParte: true,
      temaTitulo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const questionnaireIds = Array.from(new Set(candidates.map((c) => c.questionnaireId)))

  const questionnaires = await db.questionnaire.findMany({
    where: { id: { in: questionnaireIds } },
    select: {
      id: true,
      title: true,
      theme: true,
      type: true,
      category: true,
      createdAt: true,
    },
  })

  const questionnaireById = new Map(questionnaires.map((q) => [q.id, q]))

  const grouped = new Map<
    string,
    {
      questionnaireId: string
      title: string
      theme: string | null
      type: string
      category: string | null
      createdAt: string
      counts: {
        missingTemaCodigo: number
        missingTemaParte: number
        missingTemaTitulo: number
      }
      sampleQuestions: Array<{
        id: string
        createdAt: string
        textSnippet: string
        temaCodigo: string | null
        temaNumero: number | null
        temaParte: string | null
        temaTitulo: string | null
      }>
    }
  >()

  for (const row of candidates) {
    const qn = questionnaireById.get(row.questionnaireId)
    const key = row.questionnaireId
    if (!grouped.has(key)) {
      grouped.set(key, {
        questionnaireId: key,
        title: qn?.title ?? '(questionnaire not found)',
        theme: qn?.theme ?? null,
        type: qn?.type ?? 'unknown',
        category: qn?.category ?? null,
        createdAt: (qn?.createdAt ?? new Date(0)).toISOString(),
        counts: {
          missingTemaCodigo: 0,
          missingTemaParte: 0,
          missingTemaTitulo: 0,
        },
        sampleQuestions: [],
      })
    }

    const g = grouped.get(key)!
    if (isMissing(row.temaCodigo)) g.counts.missingTemaCodigo++
    if (isMissing(row.temaParte)) g.counts.missingTemaParte++
    if (isMissing(row.temaTitulo)) g.counts.missingTemaTitulo++

    if (args.samplesPerQuestionnaire > 0 && g.sampleQuestions.length < args.samplesPerQuestionnaire) {
      g.sampleQuestions.push({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        textSnippet: snippet(row.text, 180),
        temaCodigo: row.temaCodigo,
        temaNumero: row.temaNumero,
        temaParte: row.temaParte,
        temaTitulo: row.temaTitulo,
      })
    }
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => {
    const aScore = a.counts.missingTemaCodigo * 3 + a.counts.missingTemaParte * 2 + a.counts.missingTemaTitulo
    const bScore = b.counts.missingTemaCodigo * 3 + b.counts.missingTemaParte * 2 + b.counts.missingTemaTitulo
    if (bScore !== aScore) return bScore - aScore
    return b.createdAt.localeCompare(a.createdAt)
  })

  const limited = sorted.slice(0, args.limit)

  const out = {
    generatedAt: new Date().toISOString(),
    totals: {
      candidateQuestions: candidates.length,
      candidateQuestionnaires: grouped.size,
      exportedQuestionnaires: limited.length,
    },
    questionnaires: limited,
  }

  writeFileSync(args.out, JSON.stringify(out, null, 2), 'utf8')

  console.log(`\n✅ Report written: ${args.out}`)
  console.log(`   · candidateQuestions: ${candidates.length}`)
  console.log(`   · candidateQuestionnaires: ${grouped.size}`)
  console.log(`   · exportedQuestionnaires: ${limited.length}`)

  await db.$disconnect()
}

main().catch((err) => {
  console.error('❌ Export failed:', err?.message ?? err)
  process.exitCode = 1
})
