import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar documentos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const documents = await prisma.legalDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            sections: true,
            questions: true
          }
        }
      }
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('[Documents] Error al listar:', error)
    return NextResponse.json({ error: 'Error al listar documentos' }, { status: 500 })
  }
}

// POST - Subir documento
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const type = formData.get('type') as string
    const topic = formData.get('topic') as string | null
    const reference = formData.get('reference') as string | null

    if (!file || !title || !type) {
      return NextResponse.json({ 
        error: 'Archivo, título y tipo son requeridos' 
      }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.epub') && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ 
        error: 'Solo se permiten archivos TXT, EPUB o PDF' 
      }, { status: 400 })
    }

    // Extraer contenido según tipo de archivo
    const buffer = Buffer.from(await file.arrayBuffer())
    let content = ''

    if (file.name.endsWith('.pdf')) {
      // Procesar archivo PDF
      try {
        const pdfParse = require('pdf-parse-fork')
        const pdfData = await pdfParse(buffer)
        content = pdfData.text
      } catch (err) {
        console.error('Error procesando PDF:', err)
        return NextResponse.json({ 
          error: 'Error al procesar PDF. Verifica que el archivo no esté dañado o intenta con TXT/EPUB' 
        }, { status: 400 })
      }
    } else if (file.name.endsWith('.epub')) {
      // Procesar archivo EPUB
      const EPub = require('epub')
      const epub = new EPub(buffer)
      
      content = await new Promise<string>((resolve, reject) => {
        epub.on('end', async () => {
          try {
            const chapters = epub.flow.map((chapter: any) => chapter.id)
            let fullText = ''
            
            for (const chapterId of chapters) {
              const chapterText = await new Promise<string>((res, rej) => {
                epub.getChapter(chapterId, (error: any, text: string) => {
                  if (error) rej(error)
                  else {
                    // Remover tags HTML
                    const cleanText = text.replace(/<[^>]*>/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()
                    res(cleanText)
                  }
                })
              })
              fullText += chapterText + '\n\n'
            }
            resolve(fullText)
          } catch (err) {
            reject(err)
          }
        })
        epub.on('error', reject)
        epub.parse()
      })
    } else {
      // Archivo TXT
      content = buffer.toString('utf-8')
    }

    if (!content.trim()) {
      return NextResponse.json({ 
        error: 'No se pudo extraer texto del archivo' 
      }, { status: 400 })
    }

    // Crear documento en BD
    const document = await prisma.legalDocument.create({
      data: {
        title,
        type,
        topic: topic || null,
        reference: reference || null,
        fileName: file.name,
        fileSize: file.size,
        content,
        processedAt: new Date()
      }
    })

    // Dividir en secciones automáticamente (básico)
    await createSections(document.id, content)

    return NextResponse.json({ 
      document,
      message: 'Documento procesado exitosamente' 
    }, { status: 201 })
  } catch (error) {
    console.error('[Documents] Error al subir:', error)
    return NextResponse.json({ error: 'Error al procesar documento' }, { status: 500 })
  }
}

// Función auxiliar para dividir contenido en secciones
async function createSections(documentId: string, content: string) {
  const sections: Array<{ title: string; content: string; order: number }> = []
  
  // Dividir por artículos o temas (lógica básica)
  const articlePattern = /(?:Artículo|Art\.|Tema|TEMA)\s+(\d+[.\-]?\d*)[:\s]+(.*?)(?=(?:Artículo|Art\.|Tema|TEMA)\s+\d+|$)/gi
  const matches = content.matchAll(articlePattern)
  
  let order = 0
  for (const match of matches) {
    const number = match[1]
    const sectionContent = match[0]
    
    if (sectionContent.length > 100) { // Ignorar secciones muy cortas
      sections.push({
        title: `Artículo ${number}`,
        content: sectionContent,
        order: order++
      })
    }
  }

  // Si no se encontraron secciones, dividir por párrafos largos
  if (sections.length === 0) {
    const paragraphs = content.split(/\n\n+/)
    paragraphs.forEach((para, idx) => {
      if (para.trim().length > 200) {
        sections.push({
          title: `Sección ${idx + 1}`,
          content: para.trim(),
          order: idx
        })
      }
    })
  }

  // Guardar secciones
  if (sections.length > 0) {
    await prisma.documentSection.createMany({
      data: sections.map(s => ({
        ...s,
        documentId
      }))
    })
  }
}
