import { prisma } from '../src/lib/prisma'
import { TEMARIO_GENERAL, TEMARIO_ESPECIFICO, type Tema } from '../src/lib/temario'

function sanitize(value: unknown): string {
  if (value == null) return ''
  return String(value).replace(/\u0000/g, '')
}

function mapDifficulty(input?: string | null): string | null {
  if (!input) return null
  const v = input.toLowerCase().trim()
  if (v === 'easy' || v === 'facil' || v === 'baja') return 'facil'
  if (v === 'medium' || v === 'media' || v === 'intermedia' || v === 'media-alta') return 'media'
  if (v === 'hard' || v === 'dificil' || v === 'difícil' || v === 'alta' || v === 'muy alta') return 'dificil'
  return null
}

function normalizeParte(raw?: string | null): 'GENERAL' | 'ESPECÍFICO' | null {
  if (!raw) return null
  const v = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (v.includes('GENERAL')) return 'GENERAL'
  if (v.includes('ESPEC')) return 'ESPECÍFICO'
  return null
}

const TODOS: Tema[] = [...TEMARIO_GENERAL, ...TEMARIO_ESPECIFICO]

const temaByCode = new Map<string, Tema>()
for (const t of TODOS) {
  temaByCode.set(t.codigo.toUpperCase(), t)
}

const generalByNumber = new Map<number, Tema>()
for (const t of TEMARIO_GENERAL) {
  generalByNumber.set(t.numero, t)
}

const especificoByNumber = new Map<number, Tema>()
for (const t of TEMARIO_ESPECIFICO) {
  especificoByNumber.set(t.numero, t)
}

function resolveTema(
  temaCodigoRaw: string | null,
  temaNumero: number | null,
  temaParteRaw: string | null,
): Tema | null {
  const codigo = temaCodigoRaw ? temaCodigoRaw.trim().toUpperCase() : null
  const parteNorm = normalizeParte(temaParteRaw)

  if (codigo && temaByCode.has(codigo)) {
    return temaByCode.get(codigo) || null
  }

  let numero: number | null = temaNumero ?? null

  if (!numero && codigo && /^T\d{2}$/i.test(codigo)) {
    numero = parseInt(codigo.slice(1), 10)
  }

  if (!numero) return null

  if (parteNorm === 'GENERAL') {
    return generalByNumber.get(numero) || null
  }

  if (parteNorm === 'ESPECÍFICO') {
    return especificoByNumber.get(numero) || null
  }

  const general = generalByNumber.get(numero)
  if (general) return general
  const espec = especificoByNumber.get(numero)
  if (espec) return espec

  return null
}

async function main() {
  console.log('🔧 Normalizando metadatos de todos los temas en Question...')

  const questions = await prisma.question.findMany()
  console.log(`   · Preguntas totales: ${questions.length}`)

  let updatedCount = 0
  let difficultyUpdated = 0
  let temaUpdated = 0

  for (const q of questions) {
    const currentCodigo = q.temaCodigo ?? null
    const currentNumero = q.temaNumero ?? null
    const currentParte = q.temaParte ?? null

    const resolved = resolveTema(currentCodigo, currentNumero, currentParte)

    const normalizedParte = normalizeParte(currentParte)
    const newDifficulty = mapDifficulty(q.difficulty ?? null)

    const patch: any = {}

    if (resolved) {
      const newCodigo = resolved.codigo
      const newNumero = resolved.numero
      const newParte = resolved.parte
      const newTitulo = resolved.titulo

      if (q.temaCodigo !== newCodigo) patch.temaCodigo = newCodigo
      if (q.temaNumero !== newNumero) patch.temaNumero = newNumero
      if (q.temaParte !== newParte) patch.temaParte = newParte
      if (q.temaTitulo !== newTitulo) patch.temaTitulo = sanitize(newTitulo)
    } else if (normalizedParte && q.temaParte !== normalizedParte) {
      patch.temaParte = normalizedParte
    }

    if (newDifficulty && q.difficulty !== newDifficulty) {
      patch.difficulty = newDifficulty
    }

    if (Object.keys(patch).length === 0) continue

    await prisma.question.update({
      where: { id: q.id },
      data: patch,
    })

    updatedCount++
    if (patch.difficulty) difficultyUpdated++
    if (patch.temaCodigo || patch.temaNumero || patch.temaParte || patch.temaTitulo) temaUpdated++
  }

  console.log('\n✅ Normalización completada:')
  console.log('   · Preguntas actualizadas total      :', updatedCount)
  console.log('   · Preguntas con metadatos de tema   :', temaUpdated)
  console.log('   · Preguntas con dificultad normalizada:', difficultyUpdated)
}

main()
  .catch((err) => {
    console.error('❌ Error durante la normalización de metadatos:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
