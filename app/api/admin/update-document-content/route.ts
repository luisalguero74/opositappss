import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmbedding } from '@/lib/embeddings'

export async function POST(req: NextRequest) {
  try {
    // Permitir autenticación con API_KEY o sesión
    const apiKey = req.headers.get('x-api-key')
    const validApiKey = process.env.ADMIN_API_KEY
    
    if (apiKey && validApiKey && apiKey === validApiKey) {
      // Autenticado con API_KEY
    } else {
      // Verificar sesión normal
      const session = await getServerSession(authOptions)
      if (!session || session.user.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const { fileName, content } = await req.json()

    if (!fileName || !content) {
      return NextResponse.json({ 
        error: 'fileName y content son requeridos' 
      }, { status: 400 })
    }

    // Buscar documento por fileName
    const document = await prisma.legalDocument.findFirst({
      where: { fileName }
    })

    if (!document) {
      return NextResponse.json({ 
        error: `Documento no encontrado: ${fileName}` 
      }, { status: 404 })
    }

    // Actualizar contenido
    const updated = await prisma.legalDocument.update({
      where: { id: document.id },
      data: {
        content: content.substring(0, 500000), // Limitar a 500k caracteres
        processedAt: new Date()
      }
    })

    // Generar embedding
    let embeddingGenerated = false
    try {
      const embedding = await generateEmbedding(content.substring(0, 8000))
      if (embedding) {
        await prisma.legalDocument.update({
          where: { id: document.id },
          data: { embedding: JSON.stringify(embedding) }
        })
        embeddingGenerated = true
      }
    } catch (error) {
      console.error('Error generando embedding:', error)
    }

    return NextResponse.json({ 
      success: true,
      documentId: updated.id,
      fileName: updated.fileName,
      contentLength: content.length,
      embeddingGenerated
    })
  } catch (error: any) {
    console.error('[Update Content] Error:', error)
    return NextResponse.json({ 
      error: 'Error actualizando contenido',
      details: error.message 
    }, { status: 500 })
  }
}
