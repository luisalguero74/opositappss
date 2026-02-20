import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { 
      questionnaireQuestions: {
        include: {
          question: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })
  if (!questionnaire) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Mapear las preguntas a la estructura esperada por el frontend
  const questions = questionnaire.questionnaireQuestions.map(qq => qq.question)
  
  // Extraer información del tema de las preguntas (si tiene)
  let temaInfo = null
  if (questions.length > 0) {
    const firstQuestion = questions[0]
    if (firstQuestion.temaCodigo && firstQuestion.temaNumero) {
      temaInfo = {
        codigo: firstQuestion.temaCodigo,
        numero: firstQuestion.temaNumero,
        parte: firstQuestion.temaParte,
        titulo: firstQuestion.temaTitulo
      }
    }
  }
  
  return NextResponse.json({ ...questionnaire, questions, temaInfo })
}