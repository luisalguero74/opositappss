import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchRelevantContext, generateRAGResponse, ChatMessage } from '@/lib/rag-system'
import { searchOfficialSources, generateLegalCitations, enrichWithWebSources } from '@/lib/web-search'

// POST - Consultar al asistente IA con acceso a documentación interna + fuentes oficiales externas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { query, conversationHistory = [] } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ 
        error: 'Query es requerido' 
      }, { status: 400 })
    }

    console.log('[AI Assistant PRO] Query:', query)
    console.log('[AI Assistant PRO] Iniciando búsqueda en fuentes internas y externas...')

    // 1. Obtener TODOS los documentos internos (leyes + temas)
    const allDocuments = await prisma.legalDocument.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        topic: true,
        type: true
      }
    })

    console.log(`[AI Assistant PRO] Total de documentos encontrados en LegalDocument: ${allDocuments.length}`)
    
    // Si no hay documentos en LegalDocument, intentar buscar en Questionnaire (temas del temario)
    let additionalDocuments: any[] = []
    if (allDocuments.length === 0) {
      console.log('[AI Assistant PRO] LegalDocument vacía, buscando en Questionnaire (temario)...')
      const questionnaireQuestions = await prisma.questionnaire.findMany({
        where: {
          type: 'general'
        },
        take: 20,
        select: {
          id: true,
          title: true,
          statement: true,
          type: true
        }
      })
      
      additionalDocuments = questionnaireQuestions.map((q: any) => ({
        id: q.id,
        title: q.title || 'Sin título',
        content: q.statement || 'Sin contenido disponible',
        topic: 'Temario General',
        type: 'tema_general'
      }))
      
      console.log(`[AI Assistant PRO] Documentos del temario encontrados: ${additionalDocuments.length}`)
      
      // Si aún no hay suficientes, buscar en preguntas generadas
      if (additionalDocuments.length < 5) {
        console.log('[AI Assistant PRO] Pocas preguntas de temario, buscando en banco de preguntas...')
        const questions = await prisma.question.findMany({
          take: 15,
          select: {
            id: true,
            text: true,
            explanation: true,
            difficulty: true
          }
        })
        
        const questionDocs = questions.map((q: any) => ({
          id: q.id,
          title: `Pregunta: ${q.text?.substring(0, 100) || 'Sin titulo'}`,
          content: q.explanation || 'Sin explicación disponible',
          topic: 'Preguntas del sistema',
          type: 'pregunta_generada'
        }))
        
        additionalDocuments = [...additionalDocuments, ...questionDocs]
        console.log(`[AI Assistant PRO] Total documentos después de preguntas: ${additionalDocuments.length}`)
      }
    }
    
    const combinedDocuments = [...allDocuments, ...additionalDocuments]
    console.log(`[AI Assistant PRO] Total documentos para búsqueda: ${combinedDocuments.length}`)

    // 2. Buscar contexto relevante en documentación interna
    const relevantContext = combinedDocuments.length > 0
      ? await searchRelevantContext(
          query, 
          combinedDocuments.map(doc => ({ ...doc, topic: doc.topic ?? undefined })), 
          5 // Top 5 documentos más relevantes
        )
      : []

    console.log(`[AI Assistant PRO] Documentos relevantes encontrados: ${relevantContext.length}`)
    relevantContext.forEach(ctx => {
      console.log(`  📄 ${ctx.documentTitle} (score: ${ctx.relevanceScore}, tipo: ${ctx.documentType})`)
    })

    // 3. Buscar fuentes oficiales externas
    console.log('[AI Assistant PRO] Buscando fuentes oficiales externas...')
    const webSources = await searchOfficialSources(query, 3)
    console.log(`[AI Assistant PRO] Fuentes oficiales encontradas: ${webSources.length}`)
    webSources.forEach(source => {
      console.log(`  🌐 ${source.title} (${source.type})`)
    })

    // 4. Validar que tenemos información para responder
    if (relevantContext.length === 0 && webSources.length === 0) {
      console.log('[AI Assistant PRO] ⚠️ No se encontró información relevante para la query')
      return NextResponse.json({
        response: `No he encontrado información específica sobre "${query}" en la documentación disponible ni en fuentes oficiales conocidas.

📚 **Sugerencias para mejorar:**
- Reformula tu pregunta con términos más específicos del temario
- Pregunta sobre temas concretos (ej: "¿Qué es la Seguridad Social?")
- Usa términos de leyes específicas (LGSS, ET, Ley 39/2015, etc.)

📖 **Para Administradores:**
Los documentos del asistente se pueden cargar en:
- 📄 **Sección "Documentos IA"** → Sube archivos TXT, PDF o EPUB con contenido legal
- 📋 **Sección "Temario"** → Crea temas del temario oficial
- ❓ **Generador de Preguntas** → Crea más preguntas que alimentan la base de conocimiento

¿En qué área específica necesitas ayuda?`,
        sources: {
          internal: 0,
          external: 0
        },
        debug: {
          totalDocumentsAvailable: combinedDocuments.length,
          legalDocumentsCount: allDocuments.length,
          temarioDocumentsCount: additionalDocuments.length
        }
      })
    }

    // 5. Generar respuesta profesional con fundamentación legal
    console.log('[AI Assistant PRO] Generando respuesta fundamentada...')
    const response = await generateRAGResponse(
      query,
      relevantContext,
      conversationHistory as ChatMessage[]
    )

    // 6. Añadir citas de fuentes oficiales externas
    const citations = generateLegalCitations(webSources)
    const finalResponse = `${response}${citations}`

    console.log('[AI Assistant PRO] Respuesta generada exitosamente')

    return NextResponse.json({
      response: finalResponse,
      sources: {
        internal: relevantContext.map(ctx => ({
          title: ctx.documentTitle,
          type: ctx.documentType,
          relevance: Math.round(ctx.relevanceScore)
        })),
        external: webSources.map(ws => ({
          title: ws.title,
          url: ws.url,
          type: ws.type
        }))
      },
      stats: {
        internalDocs: relevantContext.length,
        externalSources: webSources.length,
        totalDocuments: combinedDocuments.length
      }
    })
  } catch (error) {
    console.error('[AI Assistant PRO] Error:', error)
    return NextResponse.json({ 
      error: 'Error al procesar la consulta. Por favor, intenta de nuevo.',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
