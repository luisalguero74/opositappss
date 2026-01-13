import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPgPool, getUserAnswerColumnInfo } from '@/lib/pg'
import {
  getCorrectAnswerLetter,
  normalizeSelectedAnswerToLetter,
  safeParseOptions
} from '@/lib/answer-normalization'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let stage = 'init'
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { answers, timeSpent } = await request.json()

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Respuestas inválidas', stage: 'validateBody' }, { status: 400 })
    }

    stage = 'getPool'
    const pool = getPgPool()

    stage = 'fetchQuestionnaire'
    const caseRes = await pool.query(
      'select id, title, type from "Questionnaire" where id = $1 and type = $2 limit 1',
      [id, 'practical']
    )
    const practicalCase = caseRes.rows[0]

    if (!practicalCase) {
      return NextResponse.json({ error: 'Supuesto no encontrado' }, { status: 404 })
    }

    stage = 'fetchQuestions'
    const questionsRes = await pool.query(
      'select id, options, "correctAnswer" from "Question" where "questionnaireId" = $1',
      [id]
    )
    const questions: Array<{ id: string; options: any; correctAnswer: string }> = questionsRes.rows.map((r: any) => ({
      id: String(r.id),
      options: r.options,
      correctAnswer: String(r.correctAnswer ?? '')
    }))

    // Calculate score (normalize to letters when possible)
    let correctAnswers = 0
    const totalQuestions = questions.length

    const questionById = new Map(questions.map(q => [q.id, q]))

    for (const q of questions) {
      const userAnswer = answers.find((a: any) => String(a.questionId) === q.id)
      if (!userAnswer) continue

      const options = safeParseOptions(q.options)
      const correctLetter = getCorrectAnswerLetter(q.correctAnswer, options)
      const selectedLetter = normalizeSelectedAnswerToLetter(String(userAnswer.selectedAnswer ?? ''), options)

      const isCorrect =
        (correctLetter && selectedLetter && correctLetter === selectedLetter) ||
        String(userAnswer.selectedAnswer ?? '').trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()

      if (isCorrect) correctAnswers++
    }

    const score = (correctAnswers / totalQuestions) * 100

    // Create attempt record if possible (optional)
    stage = 'insertAttempt'
    let attemptId: string | null = null
    try {
      const attemptRes = await pool.query(
        'insert into "QuestionnaireAttempt" ("userId", "questionnaireId", score, "correctAnswers", "totalQuestions", "timeSpent", "completedAt") values ($1,$2,$3,$4,$5,$6,$7) returning id',
        [session.user.id, id, Math.round(score), correctAnswers, totalQuestions, timeSpent ?? null, new Date()]
      )
      attemptId = String(attemptRes.rows?.[0]?.id ?? '') || null
    } catch {
      attemptId = null
    }

    // Save individual answers into UserAnswer using runtime-detected column names.
    stage = 'insertUserAnswers'
    const { answerColumn, hasAttemptId } = await getUserAnswerColumnInfo(pool)
    const cols = ['userId', 'questionnaireId', 'questionId']
    if (hasAttemptId) cols.push('attemptId')
    cols.push(answerColumn)
    cols.push('isCorrect')

    const rowsSql: string[] = []
    const values: any[] = []
    let idx = 1

    for (const a of answers) {
      const qId = String(a?.questionId ?? '')
      if (!qId) continue
      const q = questionById.get(qId)
      if (!q) continue

      const options = safeParseOptions(q.options)
      const correctLetter = getCorrectAnswerLetter(q.correctAnswer, options)
      const selectedRaw = String(a?.selectedAnswer ?? '')
      const selectedLetter = normalizeSelectedAnswerToLetter(selectedRaw, options)
      const isCorrect =
        (correctLetter && selectedLetter && correctLetter === selectedLetter) ||
        selectedRaw.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()

      const rowPlaceholders: string[] = []
      // userId, questionnaireId, questionId
      values.push(session.user.id, id, qId)
      rowPlaceholders.push(`$${idx++}`, `$${idx++}`, `$${idx++}`)

      if (hasAttemptId) {
        values.push(attemptId)
        rowPlaceholders.push(`$${idx++}`)
      }

      values.push(selectedRaw)
      rowPlaceholders.push(`$${idx++}`)

      values.push(Boolean(isCorrect))
      rowPlaceholders.push(`$${idx++}`)

      rowsSql.push(`(${rowPlaceholders.join(', ')})`)
    }

    if (rowsSql.length > 0) {
      await pool.query(
        `insert into "UserAnswer" (${cols.map(c => `"${c}"`).join(', ')}) values ${rowsSql.join(', ')}`,
        values
      )
    }

    return NextResponse.json({
      score,
      scorePercentage: score,
      correctAnswers,
      totalQuestions,
      attemptId,
      timeSpent
    })
  } catch (error) {
    console.error('Error submitting practical case:', error)
    const code = String((error as any)?.code ?? '')
    const message = String((error as any)?.message ?? '').slice(0, 300)
    return NextResponse.json(
      { error: 'Error al enviar respuestas', stage, dbErrorCode: code, dbErrorMessage: message },
      { status: 500 }
    )
  }
}
