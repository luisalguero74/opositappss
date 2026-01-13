import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'
import {
  getCorrectAnswerLetter,
  normalizeSelectedAnswerToLetter,
  safeParseOptions
} from '@/lib/answer-normalization'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: NextRequest) {
  let stage = 'start'
  let retryCount = 0
  const maxRetries = 2

  // Retry logic for transient connection errors
  while (retryCount <= maxRetries) {
    try {
      // Obtener sesión del usuario
      stage = 'getSession'
      const session = await getServerSession(authOptions)
      
      stage = 'checkAuth'
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'No autenticado', stage }, { status: 401 })
      }
      const userId = session.user.id

      stage = 'parseBody'
      const { questionnaireId, answers } = await request.json()

      if (!questionnaireId || !answers || !Array.isArray(answers)) {
        return NextResponse.json({ error: 'Datos inválidos', stage }, { status: 400 })
      }

      const questionIds = Array.from(
        new Set(
          answers
            .map((a: any) => String(a?.questionId ?? '').trim())
            .filter(Boolean)
        )
      )

      if (questionIds.length === 0) {
        return NextResponse.json({ error: 'No hay respuestas válidas', stage }, { status: 400 })
      }

      // Use PG directly to avoid Prisma schema drift issues.
      stage = 'getPool'
      const pool = getPgPool()

      stage = 'fetchQuestions'
      let qRes
      try {
        qRes = await pool.query(
          'select id, "questionnaireId", options, "correctAnswer" from "Question" where id = any($1::text[])',
          [questionIds]
        )
      } catch (err: any) {
        // Check for SSL/connection errors that might be transient
        if ((err?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') && retryCount < maxRetries) {
          console.warn(`[Submit] Retrying after connection error (attempt ${retryCount + 1}):`, err?.code)
          retryCount++
          await new Promise(r => setTimeout(r, 1000 * retryCount)) // Backoff
          continue // Retry from the beginning
        }

        // Fallbacks for environments where ids are UUID typed or schema search_path differs.
        const uuidIds = questionIds.filter(isUuid)
        try {
          if (uuidIds.length > 0) {
            qRes = await pool.query(
              'select id, "questionnaireId", options, "correctAnswer" from "Question" where id = any($1::uuid[])',
              [uuidIds]
            )
          } else {
            throw err
          }
        } catch (err2: any) {
          try {
            qRes = await pool.query(
              'select id, "questionnaireId", options, "correctAnswer" from public."Question" where id = any($1::text[])',
              [questionIds]
            )
          } catch (err3: any) {
            const code = String(err3?.code ?? err2?.code ?? err?.code ?? '')
            const message = String(err3?.message ?? err2?.message ?? err?.message ?? '').slice(0, 300)
            console.error('[Submit] Database error:', { stage, code, message })
            return NextResponse.json(
              { error: 'Error al guardar respuestas', stage, dbErrorCode: code, dbErrorMessage: message },
              { status: 500 }
            )
          }
        }
      }
      
      const questionById = new Map<string, { id: string; questionnaireId: string; options: any; correctAnswer: string }>(
        qRes.rows.map((r: any) => [String(r.id), {
          id: String(r.id),
          questionnaireId: String(r.questionnaireId),
          options: r.options,
          correctAnswer: String(r.correctAnswer ?? '')
        }])
      )

      if (questionById.size === 0) {
        return NextResponse.json(
          { error: 'No se han encontrado preguntas para guardar respuestas', stage },
          { status: 400 }
        )
      }

      stage = 'validateQuestions'
      for (const q of questionById.values()) {
        if (q.questionnaireId !== questionnaireId) {
          return NextResponse.json({ error: 'Respuestas no válidas para este cuestionario', stage }, { status: 400 })
        }
      }

      let correctAnswers = 0
      const totalQuestions = answers.length

      stage = 'normalizeAnswers'
      const normalizedAnswers = answers.map((ans: any) => {
        const q = questionById.get(String(ans?.questionId ?? ''))
        const options = q ? safeParseOptions(q.options) : []
        const correctLetter = q ? getCorrectAnswerLetter(String(q.correctAnswer ?? ''), options) : null
        const selectedLetter = normalizeSelectedAnswerToLetter(String(ans?.selectedAnswer ?? ''), options)

        const isCorrect = Boolean(selectedLetter && correctLetter && selectedLetter === correctLetter)
        if (isCorrect) correctAnswers++

        return {
          questionId: String(ans?.questionId ?? ''),
          answer: selectedLetter ?? '',
          isCorrect
        }
      })

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

      // Persist answers in a DB-compatible way.
      // Some environments use `selectedAnswer` instead of `answer`, and may not have `attemptId`.
      stage = 'detectAnswerColumn'
      const { answerColumn, hasAttemptId } = await getUserAnswerColumnInfo(pool)
      const now = new Date()

      if (normalizedAnswers.length > 0) {
        stage = 'insertUserAnswers'
        const cols = ['userId', 'questionId', 'questionnaireId', answerColumn, 'isCorrect', 'createdAt']
        if (hasAttemptId) cols.splice(3, 0, 'attemptId')

        const values: any[] = []
        const rowsSql: string[] = []
        let p = 1

        for (const a of normalizedAnswers) {
          const rowValues = [session.user.id, a.questionId, questionnaireId]
          if (hasAttemptId) rowValues.push(null)
          rowValues.push(a.answer, a.isCorrect, now)
          values.push(...rowValues)

          const placeholders = rowValues.map(() => `$${p++}`)
          rowsSql.push(`(${placeholders.join(', ')})`)
        }

        await pool.query(
          `insert into "UserAnswer" (${cols.map(c => `"${c}"`).join(', ')}) values ${rowsSql.join(', ')}`,
          values
        )
      }

      stage = 'respond'
      return NextResponse.json({ success: true, score, correctAnswers, totalQuestions, savedAnswers: normalizedAnswers.length })
    } catch (error: any) {
      // Check if it's a retryable error
      if ((error?.code === 'SELF_SIGNED_CERT_IN_CHAIN' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') && retryCount < maxRetries) {
        console.warn(`[Submit] Retrying after error (attempt ${retryCount + 1}):`, error?.code)
        retryCount++
        await new Promise(r => setTimeout(r, 1000 * retryCount)) // Backoff
        continue // Retry
      }

      console.error('[Submit] Error:', { stage, error: error?.message, code: error?.code })
      return NextResponse.json({ 
        error: 'Error al guardar respuestas',
        stage,
        ...(process.env.NODE_ENV === 'development' && { details: error?.message })
      }, { status: 500 })
    }
  }

  // Should not reach here, but just in case
  return NextResponse.json({ 
    error: 'Error al guardar respuestas - máximo de reintentos alcanzado',
    stage
  }, { status: 500 })
}