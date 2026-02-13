import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

const normalizeTemarioParte = (value: unknown): 'general' | 'especifico' | null => {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (normalized === 'general' || normalized === 'temario general') return 'general'
  if (normalized === 'especifico' || normalized === 'temario especifico') return 'especifico'
  if (normalized.includes('general')) return 'general'
  if (normalized.includes('especifico')) return 'especifico'
  return null
}

function buildAutoTitle(input: {
  temario: 'general' | 'especifico' | 'mixto'
  temas: number[]
  seq: number
}) {
  const temarioLabel =
    input.temario === 'general'
      ? 'Temario General'
      : input.temario === 'especifico'
        ? 'Temario Específico'
        : 'Temario Mixto'

  const uniqueTemas = Array.from(new Set(input.temas)).sort((a, b) => a - b)
  let temasLabel = ''
  if (uniqueTemas.length === 0) {
    temasLabel = 'Sin tema'
  } else if (uniqueTemas.length === 1) {
    temasLabel = `Tema ${uniqueTemas[0]}`
  } else if (uniqueTemas.length <= 5) {
    temasLabel = `Temas ${uniqueTemas.join(', ')}`
  } else {
    temasLabel = `Temas ${uniqueTemas[0]}-${uniqueTemas[uniqueTemas.length - 1]}`
  }

  return `${temarioLabel} - ${temasLabel} #${input.seq}`
}

// POST - Crear y publicar un cuestionario nuevo a partir de preguntas seleccionadas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const questionIds = (body?.questionIds as unknown[] | undefined)
      ?.map((id) => String(id))
      .filter(Boolean)

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos una pregunta' }, { status: 400 })
    }

    const requestedTitle = String(body?.title ?? '').trim()

    const sourceQuestions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        text: true,
        options: true,
        correctAnswer: true,
        explanation: true,
        temaCodigo: true,
        temaNumero: true,
        temaParte: true,
        temaTitulo: true,
        difficulty: true
      }
    })

    if (sourceQuestions.length !== questionIds.length) {
      return NextResponse.json({ error: 'Algunas preguntas seleccionadas no existen' }, { status: 400 })
    }

    const partes = new Set(sourceQuestions.map((q) => normalizeTemarioParte(q.temaParte)).filter(Boolean))
    const temario: 'general' | 'especifico' | 'mixto' =
      partes.size === 1 ? (Array.from(partes)[0] as any) : 'mixto'

    const temas = sourceQuestions.map((q) => q.temaNumero ?? 0).filter((n) => n > 0)

    let title = requestedTitle
    if (!title) {
      // Basic sequential number based on previous auto-generated titles for same temario+tema set
      const basePrefix =
        temario === 'general'
          ? 'Temario General - '
          : temario === 'especifico'
            ? 'Temario Específico - '
            : 'Temario Mixto - '

      const uniqueTemas = Array.from(new Set(temas)).sort((a, b) => a - b)
      let temasLabel = ''
      if (uniqueTemas.length === 0) temasLabel = 'Sin tema'
      else if (uniqueTemas.length === 1) temasLabel = `Tema ${uniqueTemas[0]}`
      else if (uniqueTemas.length <= 5) temasLabel = `Temas ${uniqueTemas.join(', ')}`
      else temasLabel = `Temas ${uniqueTemas[0]}-${uniqueTemas[uniqueTemas.length - 1]}`

      const base = `${basePrefix}${temasLabel} #`
      const count = await prisma.questionnaire.count({
        where: {
          title: { startsWith: base }
        }
      })
      const seq = count + 1
      title = buildAutoTitle({ temario, temas: uniqueTemas, seq })
    }

    const ordered = [...sourceQuestions].sort((a, b) => {
      const pa = normalizeTemarioParte(a.temaParte) ?? ''
      const pb = normalizeTemarioParte(b.temaParte) ?? ''
      if (pa !== pb) return pa.localeCompare(pb)
      const na = a.temaNumero ?? 0
      const nb = b.temaNumero ?? 0
      if (na !== nb) return na - nb
      return a.id.localeCompare(b.id)
    })

    const questionnaire = await prisma.questionnaire.create({
      data: {
        title,
        type: 'theory',
        published: true,
        questions: {
          create: ordered.map((q, index) => ({
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            temaCodigo: q.temaCodigo,
            temaNumero: q.temaNumero,
            temaParte: q.temaParte,
            temaTitulo: q.temaTitulo,
            difficulty: q.difficulty,
            order: index + 1
          }))
        }
      }
    })

    return NextResponse.json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        title: questionnaire.title,
        published: questionnaire.published
      }
    })
  } catch (error) {
    console.error('[Publish Selected Questions] Error:', error)
    return NextResponse.json({ error: 'Error al publicar la selección' }, { status: 500 })
  }
}
