import { existsSync, readFileSync } from 'node:fs'

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

async function main() {
  loadEnvFromFiles()

  const prismaModule = await import('../src/lib/prisma')
  const db = prismaModule.prisma

  const rows = await db.question.findMany({
    where: {
      OR: [{ temaTitulo: null }, { temaTitulo: '' }],
    },
    select: {
      id: true,
      questionnaireId: true,
      temaCodigo: true,
      temaNumero: true,
      temaParte: true,
      temaTitulo: true,
      questionnaire: {
        select: {
          title: true,
          theme: true,
          type: true,
          category: true,
        },
      },
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  })

  console.log(`Missing temaTitulo sample: ${rows.length}`)
  for (const r of rows) {
    console.log(
      JSON.stringify(
        {
          id: r.id,
          questionnaireId: r.questionnaireId,
          qTitle: r.questionnaire?.title,
          qTheme: r.questionnaire?.theme,
          qType: r.questionnaire?.type,
          qCategory: r.questionnaire?.category,
          temaCodigo: r.temaCodigo,
          temaNumero: r.temaNumero,
          temaParte: r.temaParte,
          temaTitulo: r.temaTitulo,
        },
        null,
        0,
      ),
    )
  }

  await db.$disconnect()
}

main().catch((err) => {
  console.error(err?.message ?? err)
  process.exitCode = 1
})
