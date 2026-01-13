import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateQuestionsFromContent, generateQuestionsWithOllama } from '@/lib/ai-question-generator'
import { chunkText } from '@/lib/document-processor'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      documentId,
      sectionId,
      count = 5,
      difficulty = 'medium',
      useOllama = false
    } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Se requiere documentId' },
        { status: 400 }
      )
    }

    // Obtener documento o sección
    let content = ''
    let topic = ''
    let docTitle = ''

    if (sectionId) {
      const section = await prisma.documentSection.findUnique({
        where: { id: sectionId },
        include: { document: true }
      })

      if (!section) {
        return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 })
      }

      if (!section.document) {
        return NextResponse.json({ error: 'Documento asociado no encontrado' }, { status: 404 })
      }

      content = section.content
      topic = section.document.topic || 'Temario general'
      docTitle = section.document.title
    } else {
      const document = await prisma.legalDocument.findUnique({
        where: { id: documentId }
      })

      if (!document) {
        return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
      }

      content = document.content
      topic = document.topic || 'Temario general'
      docTitle = document.title
    }

    // Dividir contenido en chunks si es muy largo
    const chunks = chunkText(content, 6000)
    const allQuestions = []

    console.log(`Generando preguntas para ${chunks.length} chunk(s)`)

    for (let i = 0; i < Math.min(chunks.length, 3); i++) {
      const chunk = chunks[i]
      
      try {
        const questions = useOllama
          ? await generateQuestionsWithOllama(chunk, { topic, difficulty, count: Math.ceil(count / 3) })
          : await generateQuestionsFromContent(chunk, { topic, difficulty, count: Math.ceil(count / 3) })

        allQuestions.push(...questions)
      } catch (error) {
        console.error(`Error en chunk ${i}:`, error)
      }
    }

    // Guardar preguntas en BD
    const savedQuestions = await Promise.all(
      allQuestions.slice(0, count).map(q =>
        prisma.generatedQuestion.create({
          data: {
            documentId,
            sectionId: sectionId || undefined,
            text: q.question,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty || difficulty,
            topic
          }
        })
      )
    )

    console.log(`${savedQuestions.length} preguntas generadas y guardadas`)

    return NextResponse.json({
      success: true,
      count: savedQuestions.length,
      questions: savedQuestions
    })
  } catch (error: any) {
    console.error('Error generando preguntas:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar preguntas' },
      { status: 500 }
    )
  }
}

// Obtener preguntas generadas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')
    const approved = searchParams.get('approved')
    const topic = searchParams.get('topic')

    const where: any = {}
    if (documentId) where.documentId = documentId
    if (approved === 'true') where.approved = true
    if (topic) where.topic = topic

    const questions = await prisma.generatedQuestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const documentIds = Array.from(new Set(questions.map(q => q.documentId).filter(Boolean)))
    const sectionIds = Array.from(new Set(questions.map(q => q.sectionId).filter(Boolean)))

    const [documents, sections] = await Promise.all([
      documentIds.length
        ? prisma.legalDocument.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, title: true, topic: true }
          })
        : Promise.resolve([]),
      sectionIds.length
        ? prisma.documentSection.findMany({
            where: { id: { in: sectionIds as string[] } },
            select: { id: true, title: true }
          })
        : Promise.resolve([])
    ])

    const docById = new Map(documents.map(d => [d.id, d]))
    const sectionById = new Map(sections.map(s => [s.id, s]))

    return NextResponse.json({
      questions: questions.map(q => ({
        ...q,
        document: docById.get(q.documentId) ?? null,
        section: q.sectionId ? (sectionById.get(q.sectionId) ?? null) : null
      }))
    })
  } catch (error) {
    console.error('Error obteniendo preguntas:', error)
    return NextResponse.json(
      { error: 'Error al obtener preguntas' },
      { status: 500 }
    )
  }
}

// Aprobar/rechazar preguntas
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { questionId, approved, reviewed } = body

    const updated = await prisma.generatedQuestion.update({
      where: { id: questionId },
      data: {
        approved,
        reviewed,
        reviewedBy: session.user.email,
        reviewedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, question: updated })
  } catch (error) {
    console.error('Error actualizando pregunta:', error)
    return NextResponse.json(
      { error: 'Error al actualizar pregunta' },
      { status: 500 }
    )
  }
}
