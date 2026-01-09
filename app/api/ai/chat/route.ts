import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRelevantContext, generateRAGResponse, explainConcept, generateDocumentSummary } from '@/lib/rag-system'
import type { ChatMessage } from '@/lib/rag-system'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  let query: string | undefined
  let topic: string | undefined
  let action: string | undefined
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsedBody = body as { query?: string; conversationHistory?: ChatMessage[]; topic?: string; action?: string }
    
    query = parsedBody.query
    topic = parsedBody.topic
    action = parsedBody.action || 'chat'
    const conversationHistory = parsedBody.conversationHistory || []

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
        topic: true,
        embedding: true
      }
    })

    // Buscar secciones cuyo documento esté activo
    const sectionWhere: any = {
      document: {
        active: true
      }
    }
    if (topic) {
      sectionWhere.document.topic = topic
    }

    const sections = await prisma.documentSection.findMany({
      where: sectionWhere,
      select: {
        id: true,
        title: true,
        content: true,
        documentId: true,
        document: {
          select: {
            title: true,
            topic: true,
            active: true,
            embedding: true
          }
        }
      }
    })

    const validSections = sections

    const mergedDocs = [
      ...documents.map(doc => ({ 
        id: doc.id, 
        title: doc.title, 
        content: doc.content, 
        topic: doc.topic ?? undefined,
        embedding: doc.embedding
      })),
      ...validSections.map(sec => ({
        id: sec.id,
        title: `${sec.document!.title} - ${sec.title}`,
        content: sec.content,
        topic: sec.document!.topic ?? undefined,
        embedding: sec.document!.embedding
      }))
    ]

    console.log(`📚 Documentos: ${documents.length}, Secciones válidas: ${validSections.length}`)

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
    console.error('❌ Error en chat RAG:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query,
      topic,
      action
    })
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al procesar consulta',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
