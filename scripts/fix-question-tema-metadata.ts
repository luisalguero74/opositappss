import { existsSync, readFileSync } from 'node:fs'
import { TEMARIO_ESPECIFICO, TEMARIO_GENERAL } from '../src/lib/temario'
import { normalizeTemaCodigo } from '../src/lib/tema-codigo'

type Args = {
  apply: boolean
  limit: number
  samples: boolean
  fillTitulo: boolean
  inferFromQuestionnaire: boolean
  urlEnv: string
  batchSize: number
}

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
  const args: Args = {
    apply: false,
    limit: 20,
    samples: false,
    fillTitulo: false,
    inferFromQuestionnaire: false,
    urlEnv: 'DATABASE_URL',
    batchSize: 200,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    if (a === '--samples') args.samples = true
    if (a === '--fill-titulo') args.fillTitulo = true
    if (a === '--infer-from-questionnaire') args.inferFromQuestionnaire = true
    if (a === '--limit') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n > 0) args.limit = n
      i++
    }
    if (a === '--batch-size') {
      const n = Number.parseInt(argv[i + 1] ?? '', 10)
      if (Number.isFinite(n) && n > 0) args.batchSize = n
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

function isEmpty(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function normalizeTemaParte(input: string): 'general' | 'especifico' | null {
  const t = input.trim().toLowerCase()
  if (!t) return null
  if (t.includes('espec')) return 'especifico'
  if (t.includes('general')) return 'general'
  return null
}

function inferTemaNumeroFromCodigo(codigo: string): number | null {
  const m = codigo.match(/^[GE](\d{1,2})$/)
  if (!m) return null
  const n = Number.parseInt(m[1], 10)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function inferTemaParteFromCodigo(codigo: string): 'general' | 'especifico' | null {
  const m = codigo.match(/^([GE])\d{1,2}$/)
  if (!m) return null
  return m[1] === 'E' ? 'especifico' : 'general'
}

function inferTemaCodigoFromNumeroParte(temaNumero: number, temaParte: 'general' | 'especifico'): string {
  const letter = temaParte === 'especifico' ? 'E' : 'G'
  return `${letter}${String(temaNumero).padStart(2, '0')}`
}

function inferTituloFromTemario(temaNumero: number, temaParte: 'general' | 'especifico'): string | null {
  const lista = temaParte === 'especifico' ? TEMARIO_ESPECIFICO : TEMARIO_GENERAL
  const found = lista.find(t => t.numero === temaNumero)
  if (!found) return null
  return `Tema ${String(temaNumero).padStart(2, '0')} - ${found.titulo}`
}

function normalizeCodigoLoosely(input: string): string | null {
  const trimmed = input.trim().toUpperCase()
  if (!trimmed) return null

  // Remove common separators/spaces: "E 2", "E-02", "G_3", etc.
  const cleaned = trimmed.replace(/[^A-Z0-9]/g, '')

  // First try: canonical helper (pads)
  const n1 = normalizeTemaCodigo(cleaned)
  if (n1) return n1

  // Some legacy might already be like E02 but extra zeros/spaces handled above.
  const m = cleaned.match(/^([GE])(\d{1,2})$/)
  if (m) return `${m[1]}${String(Number.parseInt(m[2], 10)).padStart(2, '0')}`

  return null
}

type CandidateRow = {
  id: string
  questionnaireId: string
  questionnaireTheme: string | null
  questionnaireTitle: string
  temaCodigo: string | null
  temaNumero: number | null
  temaParte: string | null
  temaTitulo: string | null
}

type Patch = {
  id: string
  data: {
    temaCodigo?: string | null
    temaNumero?: number | null
    temaParte?: string | null
    temaTitulo?: string | null
  }
  reason: string[]
}

type InferredTema = {
  codigo: string
  numero: number
  parte: 'general' | 'especifico'
  source: 'questionnaire.theme' | 'questionnaire.title' | 'questionnaireId'
}

function inferFromQuestionnaireId(questionnaireId: string): InferredTema | null {
  const id = questionnaireId.trim()
  if (!id) return null

  // Common slug patterns: "tema-E03-...", "tema_e03_...", etc.
  const m = id.match(/(?:^|[^a-z0-9])tema[^a-z0-9]*([GE])\s*0?(\d{1,2})(?:[^a-z0-9]|$)/i)
  if (!m) return null
  const codigo = normalizeCodigoLoosely(`${m[1]}${m[2]}`)
  if (!codigo) return null
  const numero = inferTemaNumeroFromCodigo(codigo)
  const parte = inferTemaParteFromCodigo(codigo)
  if (numero == null || parte == null) return null
  return { codigo, numero, parte, source: 'questionnaireId' }
}

function inferFromQuestionnaireTheme(theme: string): InferredTema | null {
  const t = theme.trim()
  if (!t) return null

  const codigo = normalizeCodigoLoosely(t)
  if (codigo) {
    const numero = inferTemaNumeroFromCodigo(codigo)
    const parte = inferTemaParteFromCodigo(codigo)
    if (numero != null && parte != null) return { codigo, numero, parte, source: 'questionnaire.theme' }
  }

  // Some themes might be like "Tema 9 específico". Only accept if both numero+parte are present.
  const m = t.match(/tema\s*0?(\d{1,2})/i)
  const parte = normalizeTemaParte(t)
  if (m && parte) {
    const numero = Number.parseInt(m[1], 10)
    if (!Number.isFinite(numero) || numero <= 0) return null
    const codigo2 = inferTemaCodigoFromNumeroParte(numero, parte)
    return { codigo: codigo2, numero, parte, source: 'questionnaire.theme' }
  }

  return null
}

function inferFromQuestionnaireTitle(title: string): InferredTema | null {
  const t = title.trim()
  if (!t) return null

  // Direct code in title, e.g. "E09" / "G03".
  const mCode = t.match(/\b([GE])\s*0?(\d{1,2})\b/i)
  if (mCode) {
    const codigo = normalizeCodigoLoosely(`${mCode[1]}${mCode[2]}`)
    if (codigo) {
      const numero = inferTemaNumeroFromCodigo(codigo)
      const parte = inferTemaParteFromCodigo(codigo)
      if (numero != null && parte != null) return { codigo, numero, parte, source: 'questionnaire.title' }
    }
  }

  // "Tema 09" + explicit general/espec.
  const mTema = t.match(/tema\s*0?(\d{1,2})/i)
  const parte = normalizeTemaParte(t)
  if (mTema && parte) {
    const numero = Number.parseInt(mTema[1], 10)
    if (!Number.isFinite(numero) || numero <= 0) return null
    const codigo = inferTemaCodigoFromNumeroParte(numero, parte)
    return { codigo, numero, parte, source: 'questionnaire.title' }
  }

  return null
}

function buildPatch(row: CandidateRow, fillTitulo: boolean, inferFromQuestionnaire: boolean): Patch | null {
  const reason: string[] = []
  const data: Patch['data'] = {}

  const currentCodigo = row.temaCodigo?.trim() || null
  const currentParte = row.temaParte?.trim() || null

  // 1) Normalize temaParte if present
  if (!isEmpty(currentParte)) {
    const normalizedParte = normalizeTemaParte(currentParte!)
    if (normalizedParte && normalizedParte !== currentParte) {
      data.temaParte = normalizedParte
      reason.push('normalize temaParte')
    }
  }

  // 2) Normalize temaCodigo if present
  if (!isEmpty(currentCodigo)) {
    const normalizedCodigo = normalizeCodigoLoosely(currentCodigo!)
    if (normalizedCodigo && normalizedCodigo !== currentCodigo) {
      data.temaCodigo = normalizedCodigo
      reason.push('normalize temaCodigo')
    }
  }

  // Compute effective values after normalization for inference
  const effectiveCodigo = (data.temaCodigo ?? currentCodigo) || null
  const effectiveParte = (data.temaParte ?? currentParte) || null

  // 3) If temaNumero missing, infer from codigo
  if (row.temaNumero == null && effectiveCodigo) {
    const n = inferTemaNumeroFromCodigo(effectiveCodigo)
    if (n != null) {
      data.temaNumero = n
      reason.push('infer temaNumero from temaCodigo')
    }
  }

  // 4) If temaParte missing/empty, infer from codigo
  if (isEmpty(effectiveParte) && effectiveCodigo) {
    const p = inferTemaParteFromCodigo(effectiveCodigo)
    if (p) {
      data.temaParte = p
      reason.push('infer temaParte from temaCodigo')
    }
  }

  // Refresh after inference
  const effectiveNumero = (data.temaNumero ?? row.temaNumero) ?? null
  const effectiveParte2 = (data.temaParte ?? effectiveParte) || null

  // 5.5) Optionally infer missing tema* from Questionnaire context (only fills blanks; never overwrites non-empty)
  if (inferFromQuestionnaire) {
    const needsCodigo = isEmpty(effectiveCodigo)
    const needsNumero = effectiveNumero == null
    const needsParte = isEmpty(effectiveParte2)

    if (needsCodigo || needsNumero || needsParte) {
      const inferred =
        (row.questionnaireTheme ? inferFromQuestionnaireTheme(row.questionnaireTheme) : null) ||
        inferFromQuestionnaireTitle(row.questionnaireTitle) ||
        inferFromQuestionnaireId(row.questionnaireId)

      if (inferred) {
        if (needsCodigo) {
          data.temaCodigo = inferred.codigo
          reason.push(`infer temaCodigo from ${inferred.source}`)
        }
        if (needsNumero) {
          data.temaNumero = inferred.numero
          reason.push(`infer temaNumero from ${inferred.source}`)
        }
        if (needsParte) {
          data.temaParte = inferred.parte
          reason.push(`infer temaParte from ${inferred.source}`)
        }
      }
    }
  }

  // Refresh after questionnaire inference
  const effectiveNumero2 = (data.temaNumero ?? effectiveNumero) ?? null
  const effectiveParte3 = (data.temaParte ?? effectiveParte2) || null

  // 5) If temaCodigo missing/empty, infer from numero + parte
  const effectiveCodigo2 = (data.temaCodigo ?? effectiveCodigo) || null
  if (isEmpty(effectiveCodigo2) && effectiveNumero2 != null && effectiveParte3) {
    const normalizedParte = normalizeTemaParte(effectiveParte3) ?? (effectiveParte3 as any)
    if (normalizedParte === 'general' || normalizedParte === 'especifico') {
      data.temaCodigo = inferTemaCodigoFromNumeroParte(effectiveNumero2, normalizedParte)
      reason.push('infer temaCodigo from temaNumero+temaParte')

      // Ensure temaParte canonical too
      if (data.temaParte == null && normalizedParte !== effectiveParte3) {
        data.temaParte = normalizedParte
        reason.push('normalize temaParte (after infer)')
      }
    }
  }

  // 6) Optionally fill temaTitulo
  const finalNumero = (data.temaNumero ?? effectiveNumero2) ?? null
  const finalParte = (data.temaParte ?? effectiveParte3) || null
  if (fillTitulo && isEmpty(row.temaTitulo) && finalNumero != null) {
    const normalizedParte = normalizeTemaParte(finalParte || '')
    if (normalizedParte) {
      const title = inferTituloFromTemario(finalNumero, normalizedParte)
      if (title) {
        data.temaTitulo = title
        reason.push('fill temaTitulo from temario')
      }
    }
  }

  if (Object.keys(data).length === 0) return null
  return { id: row.id, data, reason }
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
  prismaForDisconnect = db

  console.log('🧹 Fix Question tema* metadata (safe)')
  console.log(`   · mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   · urlEnv: ${args.urlEnv}`)
  console.log(`   · batchSize: ${args.batchSize}`)
  console.log(`   · fillTitulo: ${args.fillTitulo ? 'on' : 'off'}`)
  console.log(`   · inferFromQuestionnaire: ${args.inferFromQuestionnaire ? 'on' : 'off'}`)

  // Pull only rows that are likely to need work.
  // When --fill-titulo is enabled, also include rows that only miss temaTitulo.
  const candidates = args.fillTitulo
    ? await db.$queryRaw<CandidateRow[]>`
        select
          q."id",
          q."questionnaireId",
          qq."theme" as "questionnaireTheme",
          qq."title" as "questionnaireTitle",
          nullif(btrim("temaCodigo"), '') as "temaCodigo",
          "temaNumero",
          nullif(btrim("temaParte"), '') as "temaParte",
          nullif(btrim("temaTitulo"), '') as "temaTitulo"
        from "Question" q
        join "Questionnaire" qq on qq."id" = q."questionnaireId"
        where
          (
            q."temaCodigo" is null
            or btrim(q."temaCodigo") = ''
            or not (upper(btrim(q."temaCodigo")) ~ '^([GE])\\d{1,2}$')
            or q."temaNumero" is null
            or q."temaParte" is null
            or btrim(q."temaParte") = ''
            or (lower(btrim(q."temaParte")) not like '%general%' and lower(btrim(q."temaParte")) not like '%espec%')
          )
          or (q."temaTitulo" is null or btrim(q."temaTitulo") = '')
      `
    : await db.$queryRaw<CandidateRow[]>`
        select
          q."id",
          q."questionnaireId",
          qq."theme" as "questionnaireTheme",
          qq."title" as "questionnaireTitle",
          nullif(btrim("temaCodigo"), '') as "temaCodigo",
          "temaNumero",
          nullif(btrim("temaParte"), '') as "temaParte",
          nullif(btrim("temaTitulo"), '') as "temaTitulo"
        from "Question" q
        join "Questionnaire" qq on qq."id" = q."questionnaireId"
        where
          q."temaCodigo" is null
          or btrim(q."temaCodigo") = ''
          or not (upper(btrim(q."temaCodigo")) ~ '^([GE])\\d{1,2}$')
          or q."temaNumero" is null
          or q."temaParte" is null
          or btrim(q."temaParte") = ''
          or (lower(btrim(q."temaParte")) not like '%general%' and lower(btrim(q."temaParte")) not like '%espec%')
      `

  console.log(`\nCandidates: ${candidates.length}`)

  const patches: Patch[] = []
  for (const row of candidates) {
    const p = buildPatch(row, args.fillTitulo, args.inferFromQuestionnaire)
    if (p) patches.push(p)
  }

  console.log(`Patches to apply: ${patches.length}`)

  const byReason = new Map<string, number>()
  for (const p of patches) {
    for (const r of p.reason) byReason.set(r, (byReason.get(r) ?? 0) + 1)
  }

  if (byReason.size) {
    console.log('\n== Reasons (counts) ==')
    for (const [k, v] of Array.from(byReason.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${k}: ${v}`)
    }
  }

  if (args.samples) {
    console.log(`\n== Samples (limit ${args.limit}) ==`)
    for (const p of patches.slice(0, args.limit)) {
      console.log(`- ${p.id} (${p.reason.join(', ')}) -> ${JSON.stringify(p.data)}`)
    }
  }

  if (!args.apply) {
    console.log('\nDry-run complete. Re-run with --apply to write changes.')
    return
  }

  console.log('\nApplying patches...')

  let updated = 0
  for (let i = 0; i < patches.length; i += args.batchSize) {
    const chunk = patches.slice(i, i + args.batchSize)
    await db.$transaction(
      chunk.map((p) =>
        db.question.update({
          where: { id: p.id },
          data: p.data,
        })
      )
    )
    updated += chunk.length
    if (updated % (args.batchSize * 5) === 0) {
      console.log(`... updated ${updated}/${patches.length}`)
    }
  }

  console.log(`\n✅ Done. Updated rows: ${updated}`)
}

main()
  .catch((err) => {
    console.error('❌ Fix failed:', err?.message ?? err)
    process.exitCode = 1
  })
  .finally(async () => {
    if (prismaForDisconnect) {
      await prismaForDisconnect.$disconnect().catch(() => null)
    }
  })
