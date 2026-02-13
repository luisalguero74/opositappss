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
      const role = session?.user?.role?.toUpperCase()
      if (!session || role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    let fileName: string
    let content: string

    // Verificar si es FormData (con PDF) o JSON (con content)
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('multipart/form-data')) {
      // Procesar PDF desde FormData
      const formData = await req.formData()
      const file = formData.get('file') as File
      fileName = formData.get('fileName') as string
      
      if (!file || !fileName) {
        return NextResponse.json({ 
          error: 'file y fileName son requeridos' 
        }, { status: 400 })
      }

      // Verificar que es PDF
      if (!file.name.endsWith('.pdf')) {
        return NextResponse.json({ 
          error: 'Solo se aceptan archivos PDF' 
        }, { status: 400 })
      }

      // Extraer contenido del PDF
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const pdfParse = (await import('pdf-parse-fork')).default
      const pdfData = await pdfParse(buffer)
      
      content = pdfData.text
    } else {
      // Procesar JSON con content directo
      const body = await req.json()
      fileName = body.fileName
      content = body.content

      if (!fileName || !content) {
        return NextResponse.json({ 
          error: 'fileName y content son requeridos' 
        }, { status: 400 })
      }
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
