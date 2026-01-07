import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Importar preguntas exportadas desde local
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data } = await req.json()

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ 
        error: 'Datos inválidos' 
      }, { status: 400 })
    }

    let totalImported = 0
    const questionnairesCreated: string[] = []

    for (const item of data) {
      // Crear cuestionario si no existe
      let questionnaire = await prisma.questionnaire.findUnique({
        where: { id: item.questionnaireId }
      })

      if (!questionnaire) {
        questionnaire = await prisma.questionnaire.create({
          data: {
            id: item.questionnaireId,
            title: `Importado - ${item.questionCount} preguntas`,
            type: 'theory',
            published: false
          }
        })
        questionnairesCreated.push(questionnaire.id)
      }

      // Importar preguntas
      for (const q of item.questions) {
        // Verificar si ya existe (evitar duplicados)
        const existing = await prisma.question.findFirst({
          where: {
            questionnaireId: item.questionnaireId,
            text: q.text
          }
        })

        if (!existing) {
          await prisma.question.create({
            data: {
              questionnaireId: item.questionnaireId,
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              temaCodigo: q.temaCodigo,
              temaNumero: q.temaNumero,
              temaParte: q.temaParte,
              temaTitulo: q.temaTitulo,
              difficulty: q.difficulty
            }
          })
          totalImported++
        }
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
