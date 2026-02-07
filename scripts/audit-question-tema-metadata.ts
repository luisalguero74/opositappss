import { existsSync, readFileSync } from 'node:fs'

type Args = {
  limit: number
  samples: boolean
  urlEnv: string
}

// Filled once Prisma is initialized; used for safe disconnect.
let prismaForDisconnect: { $disconnect: () => Promise<unknown> } | null = null

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
        if (process.env[key] != null) continue // do not override shell env
        const rawValue = t.slice(idx + 1)
        process.env[key] = stripQuotes(rawValue)
      }
    } catch {
      // ignore
    }
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: 20, samples: false, urlEnv: 'DATABASE_URL' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--samples') args.samples = true
    if (a === '--limit') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n > 0) args.limit = n
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

function printRow(title: string, value: unknown) {
  const v = typeof value === 'bigint' ? Number(value) : value
  console.log(`${title}:`, v)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // Make script work even if terminal env vars are not exported.
  loadEnvFromFiles()

  // Allow choosing another env var (e.g. DIRECT_URL) without printing it.
  // Prisma reads DATABASE_URL (or fallbacks) at import-time.
  if (args.urlEnv !== 'DATABASE_URL') {
    const candidate = process.env[args.urlEnv]
    if (!candidate) {
      throw new Error(`Env var not set: ${args.urlEnv}`)
    }
    process.env.DATABASE_URL = candidate
  }

  const prismaModule = await import('../src/lib/prisma')
  const db = prismaModule.prisma
  prismaForDisconnect = db

  console.log('🔎 Audit Question tema* metadata (safe)')
  console.log(`   · limit: ${args.limit}`)
  console.log(`   · samples: ${args.samples ? 'on' : 'off'}`)
  console.log(`   · urlEnv: ${args.urlEnv}`)

  // Summary counts. Uses regex in Postgres; no secrets printed.
  const summaryRows = await db.$queryRaw<
    Array<{
      total: bigint
      temaCodigo_null: bigint
      temaCodigo_canonical_padded: bigint
      temaCodigo_canonical_unpadded: bigint
      temaCodigo_legacy_t: bigint
      temaCodigo_other: bigint
      temaParte_null: bigint
      temaParte_general: bigint
      temaParte_especifico: bigint
      temaParte_other: bigint
      temaTitulo_null: bigint
      temaTitulo_missing_has_code: bigint
      temaTitulo_missing_has_num_parte: bigint
      temaTitulo_missing_fillable: bigint
      mismatch_code_vs_parte: bigint
      mismatch_code_vs_numero: bigint
    }>
  >`
    select
      count(*) as total,
      count(*) filter (where "temaCodigo" is null or btrim("temaCodigo") = '') as "temaCodigo_null",
      count(*) filter (where upper(btrim("temaCodigo")) ~ '^([GE])\\d{2}$') as "temaCodigo_canonical_padded",
      count(*) filter (
        where upper(btrim("temaCodigo")) ~ '^([GE])\\d{1,2}$'
          and not (upper(btrim("temaCodigo")) ~ '^([GE])\\d{2}$')
      ) as "temaCodigo_canonical_unpadded",
      count(*) filter (where upper(btrim("temaCodigo")) ~ '^T\\d{2}$') as "temaCodigo_legacy_t",
      count(*) filter (
        where "temaCodigo" is not null
          and btrim("temaCodigo") <> ''
          and not (upper(btrim("temaCodigo")) ~ '^([GET])\\d{1,2}$')
      ) as "temaCodigo_other",

      count(*) filter (where "temaParte" is null or btrim("temaParte") = '') as "temaParte_null",
      count(*) filter (where lower(coalesce("temaParte", '')) like '%general%') as "temaParte_general",
      count(*) filter (where lower(coalesce("temaParte", '')) like '%espec%') as "temaParte_especifico",
      count(*) filter (
        where "temaParte" is not null
          and btrim("temaParte") <> ''
          and lower("temaParte") not like '%general%'
          and lower("temaParte") not like '%espec%'
      ) as "temaParte_other",

      count(*) filter (where "temaTitulo" is null or btrim("temaTitulo") = '') as "temaTitulo_null",

      count(*) filter (
        where ("temaTitulo" is null or btrim("temaTitulo") = '')
          and upper(btrim(coalesce("temaCodigo", ''))) ~ '^([GE])\\d{1,2}$'
      ) as "temaTitulo_missing_has_code",

      count(*) filter (
        where ("temaTitulo" is null or btrim("temaTitulo") = '')
          and "temaNumero" is not null
          and (
            lower(coalesce("temaParte", '')) like '%general%'
            or lower(coalesce("temaParte", '')) like '%espec%'
          )
      ) as "temaTitulo_missing_has_num_parte",

      count(*) filter (
        where ("temaTitulo" is null or btrim("temaTitulo") = '')
          and (
            upper(btrim(coalesce("temaCodigo", ''))) ~ '^([GE])\\d{1,2}$'
            or (
              "temaNumero" is not null
              and (
                lower(coalesce("temaParte", '')) like '%general%'
                or lower(coalesce("temaParte", '')) like '%espec%'
              )
            )
          )
      ) as "temaTitulo_missing_fillable",

      count(*) filter (
        where upper(btrim("temaCodigo")) ~ '^([GE])\\d{1,2}$'
          and (
            (substring(upper(btrim("temaCodigo")) from 1 for 1) = 'E' and lower(coalesce("temaParte", '')) not like '%espec%')
            or (substring(upper(btrim("temaCodigo")) from 1 for 1) = 'G' and lower(coalesce("temaParte", '')) not like '%general%')
          )
      ) as "mismatch_code_vs_parte",

      count(*) filter (
        where upper(btrim("temaCodigo")) ~ '^([GE])\\d{1,2}$'
          and "temaNumero" is not null
          and (
            regexp_replace(upper(btrim("temaCodigo")), '^[GE]0*', '')::int <> "temaNumero"
          )
      ) as "mismatch_code_vs_numero"
    from "Question";
  `

  const s = summaryRows[0]
  if (!s) throw new Error('No summary rows returned')

  console.log('\n== Summary ==')
  printRow('Total Question', s.total)
  printRow('temaCodigo null/empty', s.temaCodigo_null)
  printRow('temaCodigo canonical padded (G03/E09)', s.temaCodigo_canonical_padded)
  printRow('temaCodigo canonical unpadded (G3/E9)', s.temaCodigo_canonical_unpadded)
  printRow('temaCodigo legacy Txx (T03)', s.temaCodigo_legacy_t)
  printRow('temaCodigo other (unexpected)', s.temaCodigo_other)

  printRow('temaParte null/empty', s.temaParte_null)
  printRow('temaParte ~general', s.temaParte_general)
  printRow('temaParte ~espec', s.temaParte_especifico)
  printRow('temaParte other (unexpected)', s.temaParte_other)

  printRow('temaTitulo null/empty', s.temaTitulo_null)
  printRow('temaTitulo missing (has temaCodigo)', s.temaTitulo_missing_has_code)
  printRow('temaTitulo missing (has temaNumero+temaParte)', s.temaTitulo_missing_has_num_parte)
  printRow('temaTitulo missing (fillable)', s.temaTitulo_missing_fillable)

  printRow('Mismatch: temaCodigo letter vs temaParte', s.mismatch_code_vs_parte)
  printRow('Mismatch: temaCodigo digits vs temaNumero', s.mismatch_code_vs_numero)

  console.log(`\n== Top temaCodigo (limit ${args.limit}) ==`)
  const topCodigo = await db.$queryRaw<Array<{ temaCodigo: string | null; n: bigint }>>`
    select
      nullif(btrim("temaCodigo"), '') as "temaCodigo",
      count(*) as n
    from "Question"
    group by 1
    order by n desc nulls last
    limit ${args.limit};
  `
  for (const r of topCodigo) {
    const code = r.temaCodigo ?? '(null)'
    console.log(`- ${code}: ${Number(r.n)}`)
  }

  console.log(`\n== Top temaParte (limit ${args.limit}) ==`)
  const topParte = await db.$queryRaw<Array<{ temaParte: string | null; n: bigint }>>`
    select
      nullif(btrim("temaParte"), '') as "temaParte",
      count(*) as n
    from "Question"
    group by 1
    order by n desc nulls last
    limit ${args.limit};
  `
  for (const r of topParte) {
    const p = r.temaParte ?? '(null)'
    console.log(`- ${p}: ${Number(r.n)}`)
  }

  if (args.samples) {
    console.log(`\n== Samples (limit ${args.limit}) ==`)

    const samplesNullCodigo = await db.question.findMany({
      where: {
        OR: [{ temaCodigo: null }, { temaCodigo: '' }],
      },
      select: { id: true, questionnaireId: true, temaCodigo: true, temaNumero: true, temaParte: true },
      take: args.limit,
      orderBy: { createdAt: 'desc' },
    })

    console.log('\n- Missing temaCodigo (latest):')
    for (const q of samplesNullCodigo) {
      console.log(`  · ${q.id} (questionnaireId=${q.questionnaireId}) temaCodigo=${q.temaCodigo ?? 'null'} temaNumero=${q.temaNumero ?? 'null'} temaParte=${q.temaParte ?? 'null'}`)
    }

    const samplesLegacyT = await db.$queryRaw<Array<{ id: string; questionnaireId: string; temaCodigo: string | null }>>`
      select "id", "questionnaireId", "temaCodigo"
      from "Question"
      where upper(btrim("temaCodigo")) ~ '^T\\d{2}$'
      order by "createdAt" desc
      limit ${args.limit};
    `

    console.log('\n- Legacy temaCodigo (Txx) (latest):')
    for (const q of samplesLegacyT) {
      console.log(`  · ${q.id} (questionnaireId=${q.questionnaireId}) temaCodigo=${q.temaCodigo ?? 'null'}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Audit failed:', err?.message ?? err)
    process.exitCode = 1
  })
  .finally(async () => {
    if (prismaForDisconnect) {
      await prismaForDisconnect.$disconnect().catch(() => null)
    }
  })
