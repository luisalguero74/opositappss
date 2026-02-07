import { existsSync, readFileSync } from 'node:fs'
import { TEMARIO_ESPECIFICO, TEMARIO_GENERAL } from '../src/lib/temario'
import { normalizeTemaCodigo } from '../src/lib/tema-codigo'

type Args = {
  questionnaireId: string
  temaCodigo: string
  apply: boolean
  overwrite: boolean
  urlEnv: string
  batchSize: number
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
    questionnaireId: '',
    temaCodigo: '',
    apply: false,
    overwrite: false,
    urlEnv: 'DATABASE_URL',
    batchSize: 200,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--questionnaire-id') {
      args.questionnaireId = (argv[i + 1] ?? '').trim()
      i++
    }
    if (a === '--tema-codigo') {
      args.temaCodigo = (argv[i + 1] ?? '').trim()
      i++
    }
    if (a === '--apply') args.apply = true
    if (a === '--overwrite') args.overwrite = true
    if (a === '--url-env') {
      const v = (argv[i + 1] ?? '').trim()
      if (v) args.urlEnv = v
      i++
    }
    if (a === '--batch-size') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n > 0) args.batchSize = n
      i++
    }
  }

  if (!args.questionnaireId) throw new Error('Missing --questionnaire-id')
  if (!args.temaCodigo) throw new Error('Missing --tema-codigo')

  return args
}

function isEmpty(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function resolveTema(codigoInput: string): {
  codigo: string
  numero: number | null
  parte: 'GENERAL' | 'ESPECÍFICO' | null
  titulo: string | null
} {
  const normalized = normalizeTemaCodigo(codigoInput.trim().toUpperCase())
  if (!normalized) {
    throw new Error(`Invalid temaCodigo: ${codigoInput}`)
  }

  const all = [...TEMARIO_GENERAL, ...TEMARIO_ESPECIFICO]
  const found = all.find((t) => t.codigo === normalized)

  return {
    codigo: normalized,
    numero: found?.numero ?? null,
    parte: found?.parte ?? null,
    titulo: found
      ? `Tema ${String(found.numero).padStart(2, '0')} - ${found.titulo}`
      : null,
  }
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

  const tema = resolveTema(args.temaCodigo)

  console.log('🏷️  Set tema for questionnaire (safe)')
  console.log(`   · mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   · questionnaireId: ${args.questionnaireId}`)
  console.log(`   · temaCodigo: ${tema.codigo}`)
  console.log(`   · overwrite: ${args.overwrite ? 'on' : 'off'}`)
  console.log(`   · urlEnv: ${args.urlEnv}`)

  const qn = await db.questionnaire.findUnique({
    where: { id: args.questionnaireId },
    select: { id: true, title: true, theme: true, type: true },
  })

  if (!qn) throw new Error('Questionnaire not found')

  console.log(`\nQuestionnaire: ${qn.title} (type=${qn.type}, theme=${qn.theme ?? 'null'})`)

  const questions = await db.question.findMany({
    where: { questionnaireId: args.questionnaireId },
    select: {
      id: true,
      temaCodigo: true,
      temaNumero: true,
      temaParte: true,
      temaTitulo: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const patches = questions
    .map((q) => {
      const data: {
        temaCodigo?: string | null
        temaNumero?: number | null
        temaParte?: string | null
        temaTitulo?: string | null
      } = {}

      const shouldSet = (current: unknown) => args.overwrite || isEmpty(current)

      if (shouldSet(q.temaCodigo)) data.temaCodigo = tema.codigo
      if (shouldSet(q.temaNumero)) data.temaNumero = tema.numero
      if (shouldSet(q.temaParte)) data.temaParte = tema.parte
      if (shouldSet(q.temaTitulo)) data.temaTitulo = tema.titulo

      if (Object.keys(data).length === 0) return null
      return { id: q.id, data }
    })
    .filter(Boolean) as Array<{ id: string; data: any }>

  console.log(`\nQuestions in questionnaire: ${questions.length}`)
  console.log(`Patches to apply: ${patches.length}`)

  if (!args.apply) {
    console.log('\nDry-run complete. Re-run with --apply to write changes.')
    await db.$disconnect()
    return
  }

  let updated = 0
  for (let i = 0; i < patches.length; i += args.batchSize) {
    const chunk = patches.slice(i, i + args.batchSize)
    await db.$transaction(
      chunk.map((p) =>
        db.question.update({
          where: { id: p.id },
          data: p.data,
        }),
      ),
    )
    updated += chunk.length
  }

  console.log(`\n✅ Done. Updated rows: ${updated}`)

  await db.$disconnect()
}

main().catch((err) => {
  console.error('❌ Set tema failed:', err?.message ?? err)
  process.exitCode = 1
})
