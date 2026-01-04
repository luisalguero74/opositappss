import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const questionnaire = await prisma.questionnaire.findUnique({
    where: { id },
    include: { questions: true }
  })
  if (!questionnaire) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Extraer información del tema de las preguntas (si tiene)
  let temaInfo = null
  if (questionnaire.questions.length > 0) {
    const firstQuestion = questionnaire.questions[0]
    if (firstQuestion.temaCodigo && firstQuestion.temaNumero) {
      temaInfo = {
        codigo: firstQuestion.temaCodigo,
        numero: firstQuestion.temaNumero,
        parte: firstQuestion.temaParte,
        titulo: firstQuestion.temaTitulo
      }
    }
  }
  
  return NextResponse.json({ ...questionnaire, temaInfo })
}