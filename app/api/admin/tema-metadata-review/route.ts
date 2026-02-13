import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeTemaCodigo } from '@/lib/tema-codigo'
import { TODOS_LOS_TEMAS } from '@/lib/temario'
import { Prisma } from '@prisma/client'

function isAdminSession(session: any): boolean {
  return Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
}

type ReviewRow = {
  questionnaireId: string
  questionnaireTitle: string
  questionnaireTheme: string | null
  questionnaireType: string
  totalQuestions: number
  missingTemaCodigo: number
  missingTemaParte: number
  missingTemaTitulo: number
  samples: Array<{
    id: string
    createdAt: string
    textSnippet: string
    temaCodigo: string | null
    temaNumero: number | null
    temaParte: string | null
    temaTitulo: string | null
  }>
}

type AggregatedRow = {
  questionnaireId: string
  questionnaireTitle: string
  questionnaireTheme: string | null
  questionnaireType: string
  totalQuestions: bigint
  missingTemaCodigo: bigint
  missingTemaParte: bigint
  missingTemaTitulo: bigint
}

type SampleRow = {
  id: string
  questionnaireId: string
  createdAt: Date
  text: string
  temaCodigo: string | null
  temaNumero: number | null
  temaParte: string | null
  temaTitulo: string | null
}

function snippet(text: string, max = 180): string {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return t.slice(0, max - 1) + '…'
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limitParam = Number(searchParams.get('limit') || '50')
  const limit = Number.isFinite(limitParam) ? Math.min(200, Math.max(1, limitParam)) : 50

  const aggregated = await prisma.$queryRaw<AggregatedRow[]>`
    select
      q."questionnaireId" as "questionnaireId",
      qq."title" as "questionnaireTitle",
      qq."theme" as "questionnaireTheme",
      qq."type" as "questionnaireType",
      count(*) as "totalQuestions",
      count(*) filter (where q."temaCodigo" is null or btrim(q."temaCodigo") = '') as "missingTemaCodigo",
      count(*) filter (where q."temaParte" is null or btrim(q."temaParte") = '') as "missingTemaParte",
      count(*) filter (where q."temaTitulo" is null or btrim(q."temaTitulo") = '') as "missingTemaTitulo"
    from "Question" q
    join "Questionnaire" qq on qq."id" = q."questionnaireId"
    group by q."questionnaireId", qq."title", qq."theme", qq."type"
    having
      count(*) filter (where q."temaCodigo" is null or btrim(q."temaCodigo") = '') > 0
      or count(*) filter (where q."temaParte" is null or btrim(q."temaParte") = '') > 0
      or count(*) filter (where q."temaTitulo" is null or btrim(q."temaTitulo") = '') > 0
    order by (count(*) filter (where q."temaCodigo" is null or btrim(q."temaCodigo") = '')) desc,
             (count(*) filter (where q."temaParte" is null or btrim(q."temaParte") = '')) desc,
             (count(*) filter (where q."temaTitulo" is null or btrim(q."temaTitulo") = '')) desc
    limit ${limit};
  `

  const questionnaireIds = aggregated.map((r) => r.questionnaireId)

  const samples = questionnaireIds.length
    ? await prisma.$queryRaw<SampleRow[]>`
        select
          s."id",
          s."questionnaireId",
          s."createdAt",
          s."text",
          s."temaCodigo",
          s."temaNumero",
          s."temaParte",
          s."temaTitulo"
        from (
          select
            q."id",
            q."questionnaireId",
            q."createdAt",
            q."text",
            q."temaCodigo",
            q."temaNumero",
            q."temaParte",
            q."temaTitulo",
            row_number() over (partition by q."questionnaireId" order by q."createdAt" desc) as rn
          from "Question" q
          where q."questionnaireId" in (${Prisma.join(questionnaireIds.map((id) => Prisma.sql`${id}`))})
        ) s
        where s.rn <= 3
        order by s."questionnaireId" asc, s."createdAt" desc;
      `
    : []

  const samplesByQuestionnaireId = new Map<string, SampleRow[]>()
  for (const s of samples) {
    const list = samplesByQuestionnaireId.get(s.questionnaireId) ?? []
    list.push(s)
    samplesByQuestionnaireId.set(s.questionnaireId, list)
  }

  const rows: ReviewRow[] = aggregated.map((r) => {
    const list = (samplesByQuestionnaireId.get(r.questionnaireId) ?? []).slice(0, 3)
    return {
      questionnaireId: r.questionnaireId,
      questionnaireTitle: r.questionnaireTitle,
      questionnaireTheme: r.questionnaireTheme,
      questionnaireType: r.questionnaireType,
      totalQuestions: Number(r.totalQuestions),
      missingTemaCodigo: Number(r.missingTemaCodigo),
      missingTemaParte: Number(r.missingTemaParte),
      missingTemaTitulo: Number(r.missingTemaTitulo),
      samples: list.map((s) => ({
        id: s.id,
        createdAt: new Date(s.createdAt).toISOString(),
        textSnippet: snippet(s.text, 220),
        temaCodigo: s.temaCodigo,
        temaNumero: s.temaNumero,
        temaParte: s.temaParte,
        temaTitulo: s.temaTitulo
      }))
    }
  })

  return NextResponse.json({ rows, total: rows.length })
}

type ApplyBody = {
  questionnaireId?: string
  temaCodigo?: string
  overwrite?: boolean
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: ApplyBody = {}
  try {
    body = (await req.json()) || {}
  } catch {
    body = {}
  }

  const questionnaireId = String(body.questionnaireId || '').trim()
  const rawTemaCodigo = String(body.temaCodigo || '').trim()
  const overwrite = Boolean(body.overwrite)

  if (!questionnaireId || !rawTemaCodigo) {
    return NextResponse.json({ error: 'Faltan datos: questionnaireId y temaCodigo' }, { status: 400 })
  }

  const temaCodigo = normalizeTemaCodigo(rawTemaCodigo)
  if (!temaCodigo) {
    return NextResponse.json({ error: 'temaCodigo inválido' }, { status: 400 })
  }

  const tema = TODOS_LOS_TEMAS.find((t) => t.codigo === temaCodigo)
  if (!tema) {
    return NextResponse.json({ error: `temaCodigo no existe en el temario: ${temaCodigo}` }, { status: 400 })
  }

  const temaParte = tema.parte
  const temaNumero = tema.numero
  const temaTitulo = `Tema ${String(tema.numero).padStart(2, '0')} - ${tema.titulo}`

  // Ensure questionnaire exists
  const qn = await prisma.questionnaire.findUnique({ where: { id: questionnaireId }, select: { id: true } })
  if (!qn) {
    return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
  }

  if (overwrite) {
    const result = await prisma.question.updateMany({
      where: { questionnaireId },
      data: {
        temaCodigo,
        temaNumero,
        temaParte,
        temaTitulo
      }
    })

    return NextResponse.json({ ok: true, updated: result.count, overwrite: true })
  }

  // Fill-only:
  // - Never overwrite an existing temaCodigo (only set temaCodigo when missing)
  // - Still fill missing parte/numero/titulo for rows that already have the selected temaCodigo
  const [rMissingCode, rFillFieldsForCode, rFillTituloForCode] = await prisma.$transaction([
    prisma.question.updateMany({
      where: {
        questionnaireId,
        OR: [{ temaCodigo: null }, { temaCodigo: '' }]
      },
      data: {
        temaCodigo,
        temaNumero,
        temaParte,
        temaTitulo
      }
    }),
    prisma.question.updateMany({
      where: {
        questionnaireId,
        temaCodigo,
        OR: [{ temaNumero: null }, { temaParte: null }, { temaParte: '' }]
      },
      data: {
        temaNumero,
        temaParte,
        temaTitulo
      }
    }),
    prisma.question.updateMany({
      where: {
        questionnaireId,
        temaCodigo,
        OR: [{ temaTitulo: null }, { temaTitulo: '' }]
      },
      data: {
        temaTitulo
      }
    })
  ])

  return NextResponse.json({
    ok: true,
    updated: rMissingCode.count + rFillFieldsForCode.count + rFillTituloForCode.count,
    overwrite: false
  })
}
