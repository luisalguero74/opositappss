import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPgPool } from '@/lib/pg'
import { getCorrectAnswerLetter, safeParseOptions } from '@/lib/answer-normalization'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const pool = getPgPool()
    const failedRes = await pool.query(
      `
      select
        ua."questionId" as "questionId",
        ua."createdAt" as "createdAt",
        q.id as "q_id",
        q.text as "q_text",
        q.options as "q_options",
        q."correctAnswer" as "q_correctAnswer",
        q.explanation as "q_explanation",
        q."temaCodigo" as "q_temaCodigo",
        q."temaNumero" as "q_temaNumero",
        q."temaTitulo" as "q_temaTitulo",
        q.difficulty as "q_difficulty",
        qq.title as "qq_title",
        qq.type as "qq_type"
      from "UserAnswer" ua
      join "Question" q on q.id = ua."questionId"
      join "Questionnaire" qq on qq.id = ua."questionnaireId"
      where ua."userId" = $1 and ua."isCorrect" = false
      order by ua."createdAt" desc
      `,
      [session.user.id]
    )

    // Agrupar por pregunta y contar fallos
    const questionFailures = new Map<string, {
      question: any
      count: number
      lastFailed: Date
      questionnaire: any
    }>()

    for (const row of failedRes.rows) {
      const qId = String(row.questionId)
      if (!questionFailures.has(qId)) {
        const question = {
          id: String(row.q_id),
          text: row.q_text,
          options: row.q_options,
          correctAnswer: row.q_correctAnswer,
          explanation: row.q_explanation,
          temaCodigo: row.q_temaCodigo,
          temaNumero: row.q_temaNumero,
          temaTitulo: row.q_temaTitulo,
          difficulty: row.q_difficulty
        }
        const questionnaire = { title: row.qq_title, type: row.qq_type }
        questionFailures.set(qId, {
          question,
          questionnaire,
          count: 0,
          lastFailed: new Date(row.createdAt)
        })
      }
      const entry = questionFailures.get(qId)!
      entry.count++
      const createdAt = new Date(row.createdAt)
      if (createdAt > entry.lastFailed) {
        entry.lastFailed = createdAt
      }
    }

    const failedQuestions = Array.from(questionFailures.values())
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      total: failedQuestions.length,
      questions: failedQuestions.map(q => ({
        questionId: q.question.id,
        text: q.question.text,
        options: safeParseOptions(q.question.options),
        correctAnswer: (getCorrectAnswerLetter(String(q.question.correctAnswer ?? ''), safeParseOptions(q.question.options)) ?? 'a').toUpperCase(),
        explanation: q.question.explanation,
        temaCodigo: q.question.temaCodigo,
        temaNumero: q.question.temaNumero,
        temaTitulo: q.question.temaTitulo,
        difficulty: q.question.difficulty,
        questionnaire: q.questionnaire,
        timesFailed: q.count,
        lastFailed: q.lastFailed
      }))
    })

  } catch (error) {
    console.error('[Failed Questions] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener preguntas falladas'
    }, { status: 500 })
  }
}
