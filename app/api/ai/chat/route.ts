import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRelevantContext, generateRAGResponse, explainConcept, generateDocumentSummary } from '@/lib/rag-system'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { query, conversationHistory = [], topic, action = 'chat' } = body

    if (!query) {
      return NextResponse.json({ error: 'Se requiere query' }, { status: 400 })
    }

    // Buscar documentos y secciones relevantes
    const where: any = { active: true }
    if (topic) where.topic = topic

    const documents = await prisma.legalDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        topic: true
      }
    })

    const sections = await prisma.documentSection.findMany({
      where: topic ? { document: { topic } } : {},
      select: {
        id: true,
        title: true,
        content: true,
        document: {
          select: {
            title: true,
            topic: true
          }
        }
      }
    })

    const mergedDocs = [
      ...documents.map(doc => ({ id: doc.id, title: doc.title, content: doc.content, topic: doc.topic ?? undefined })),
      ...sections.map(sec => ({
        id: sec.id,
        title: `${sec.document.title} - ${sec.title}`,
        content: sec.content,
        topic: sec.document.topic ?? undefined
      }))
    ]

    const relevantContext = await searchRelevantContext(query, mergedDocs)

    console.log(`Encontrados ${relevantContext.length} documentos relevantes`)

    let response = ''

    switch (action) {
      case 'chat':
        response = await generateRAGResponse(query, relevantContext, conversationHistory)
        break

      case 'explain':
        response = await explainConcept(query, relevantContext)
        break

      case 'summarize':
        if (relevantContext.length > 0) {
          response = await generateDocumentSummary(
            relevantContext[0].documentTitle,
            relevantContext[0].content
          )
        } else {
          response = 'No se encontraron documentos relevantes para resumir.'
        }
        break

      default:
        response = await generateRAGResponse(query, relevantContext, conversationHistory)
    }

    return NextResponse.json({
      success: true,
      response,
      sources: relevantContext.map(c => ({
        documentId: c.documentId,
        title: c.documentTitle,
        relevanceScore: c.relevanceScore
      }))
    })
  } catch (error: any) {
    console.error('Error en chat RAG:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar consulta' },
      { status: 500 }
    )
  }
}
