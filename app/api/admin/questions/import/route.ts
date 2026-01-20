import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function normalizeTemaParte(value: unknown): string | null {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const normalized = raw
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.startsWith('GEN')) {
    return 'GENERAL'
  }
  if (normalized.startsWith('ESP')) {
    return 'ESPECÍFICO'
  }

  return raw
}

function sanitizeString(value: unknown): string {
  if (value == null) return ''

  // Eliminar bytes nulos ("\u0000") que Postgres no admite en campos de texto
  return String(value).replace(/\u0000/g, '')
}

// Importar preguntas exportadas desde local o generadas en formato simplificado
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    let data = body?.data

    // Soportar también ficheros con formato simplificado: { questionnaireId?, tema*, difficulty?, questions: [...] }
    if (!Array.isArray(data) || data.length === 0) {
      if (Array.isArray(body?.questions)) {
        const questionnaireId = body.questionnaireId || `imported-${Date.now()}`

        data = [
          {
            questionnaireId,
            questionCount: body.questions.length,
            questions: body.questions,
            temaCodigo: body.temaCodigo,
            temaNumero: body.temaNumero,
            temaParte: body.temaParte,
            temaTitulo: body.temaTitulo,
            difficulty: body.difficulty
          }
        ]
      } else {
        return NextResponse.json({ 
          error: 'Datos inválidos' 
        }, { status: 400 })
      }
    }

    let totalImported = 0
    const questionnairesCreated: string[] = []

    for (const item of data) {
      const questionnaireId = String(item.questionnaireId)

      // Crear cuestionario si no existe
      let questionnaire = await prisma.questionnaire.findUnique({
        where: { id: questionnaireId }
      })

      if (!questionnaire) {
        questionnaire = await prisma.questionnaire.create({
          data: {
            id: questionnaireId,
            title: `Importado - ${item.questionCount ?? (item.questions?.length ?? 0)} preguntas`,
            type: 'theory',
            published: false
          }
        })
        questionnairesCreated.push(questionnaire.id)
      }

      // Importar preguntas
      let importedForThisQuestionnaire = 0
      for (const q of item.questions || []) {
        const rawText = sanitizeString(q.text ?? q.question)

        // Preparar opciones: aceptar tanto string JSON como array de strings
        const rawOptions = q.options
        let optionsString = ''
        let optionsArray: string[] | null = null

        if (Array.isArray(rawOptions)) {
          optionsArray = rawOptions.map((opt: unknown) => sanitizeString(opt))
          optionsString = JSON.stringify(optionsArray)
        } else if (typeof rawOptions === 'string') {
          const cleaned = sanitizeString(rawOptions)
          optionsString = cleaned
          if (cleaned.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(cleaned)
              if (Array.isArray(parsed)) {
                optionsArray = parsed.map((opt: unknown) => sanitizeString(opt))
              }
            } catch {
              // si falla el parseo, dejamos optionsArray como null
            }
          }
        } else {
          optionsString = sanitizeString(rawOptions)
        }

        // Calcular respuesta correcta: aceptar letra (A-D) o texto completo
        const rawCorrect = q.correctAnswer
        let correctAnswer = ''

        if (
          typeof rawCorrect === 'string' &&
          /^[A-D]$/i.test(rawCorrect) &&
          optionsArray &&
          optionsArray.length >= 4
        ) {
          const idxMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 }
          const idx = idxMap[rawCorrect.toLowerCase()]
          correctAnswer = sanitizeString(optionsArray[idx] ?? rawCorrect)
        } else {
          correctAnswer = sanitizeString(rawCorrect)
        }

        const temaCodigo = sanitizeString(q.temaCodigo ?? item.temaCodigo)
        const temaNumero = q.temaNumero ?? item.temaNumero ?? null
        const temaParte = normalizeTemaParte(q.temaParte ?? item.temaParte)
        const temaTitulo = sanitizeString(q.temaTitulo ?? item.temaTitulo)
        const difficulty = sanitizeString(q.difficulty ?? item.difficulty)

        // Verificar si ya existe (evitar duplicados)
        const existing = await prisma.question.findFirst({
          where: {
            questionnaireId,
            text: rawText
          }
        })

        if (!existing) {
          await prisma.question.create({
            data: {
              questionnaireId,
              text: rawText,
              options: optionsString,
              correctAnswer,
              explanation: sanitizeString(q.explanation),
              temaCodigo,
              temaNumero,
              temaParte,
              temaTitulo,
              difficulty
            }
          })
          totalImported++
          importedForThisQuestionnaire++
        }
      }

      // Si hemos importado al menos una pregunta nueva para este cuestionario,
      // actualizamos su updatedAt para que suba en los listados ordenados por última actualización.
      if (importedForThisQuestionnaire > 0) {
        await prisma.questionnaire.update({
          where: { id: questionnaireId },
          data: { updatedAt: new Date() }
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: totalImported,
      questionnairesCreated: questionnairesCreated.length
    })

  } catch (error) {
    console.error('[Import Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al importar preguntas',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
