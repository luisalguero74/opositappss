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
    // const type = formData.get('type') as string // REMOVIDO - columna no existe en BD producción
    const topic = formData.get('topic') as string | null
    const reference = formData.get('reference') as string | null

    if (!file || !title) {
      return NextResponse.json({ 
        error: 'Archivo y título son requeridos' 
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
        console.log(`[PDF] Procesando archivo: ${file.name} (${file.size} bytes)`)
        const pdfData = await pdfParse(buffer)
        content = pdfData.text
        console.log(`[PDF] Texto extraído: ${content.length} caracteres`)
        
        if (!content || content.trim().length < 100) {
          throw new Error('El PDF no contiene texto extraíble. Puede estar escaneado o ser una imagen.')
        }
      } catch (err: any) {
        console.error('Error procesando PDF:', err)
        return NextResponse.json({ 
          error: 'Error al procesar PDF',
          details: err.message || 'Verifica que el archivo no esté dañado, protegido o sea un PDF escaneado'
        }, { status: 400 })
      }
    } else if (file.name.endsWith('.epub')) {
      // Procesar archivo EPUB
      try {
        const EPub = require('epub')
        console.log(`[EPUB] Procesando archivo: ${file.name} (${file.size} bytes)`)
        const epub = new EPub(buffer)
        
        content = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout procesando EPUB - el archivo es demasiado grande o complejo'))
          }, 30000) // 30 segundos timeout

          epub.on('end', async () => {
            try {
              clearTimeout(timeout)
              const chapters = epub.flow.map((chapter: any) => chapter.id)
              let fullText = ''
              
              // Limitar a 200 capítulos
              const chaptersToProcess = chapters.slice(0, 200)
              
              for (const chapterId of chaptersToProcess) {
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
                
                // Limitar tamaño total
                if (fullText.length > 500000) break // Max 500k caracteres
              }
              
              console.log(`[EPUB] Texto extraído: ${fullText.length} caracteres de ${chaptersToProcess.length} capítulos`)
              resolve(fullText)
            } catch (err) {
              clearTimeout(timeout)
              reject(err)
            }
          })
          epub.on('error', (err: any) => {
            clearTimeout(timeout)
            reject(err)
          })
          epub.parse()
        })
        
        if (!content || content.trim().length < 100) {
          throw new Error('El EPUB no contiene texto extraíble')
        }
      } catch (err: any) {
        console.error('Error procesando EPUB:', err)
        return NextResponse.json({ 
          error: 'Error al procesar EPUB',
          details: err.message || 'Verifica que el archivo no esté dañado o corrupto'
        }, { status: 400 })
      }
    } else {
      // Archivo TXT
      try {
        console.log(`[TXT] Procesando archivo: ${file.name} (${file.size} bytes)`)
        content = buffer.toString('utf-8')
        console.log(`[TXT] Texto extraído: ${content.length} caracteres`)
      } catch (err: any) {
        console.error('Error procesando TXT:', err)
        return NextResponse.json({ 
          error: 'Error al procesar TXT',
          details: err.message || 'Verifica la codificación del archivo (debe ser UTF-8)'
        }, { status: 400 })
      }
    }

    if (!content.trim()) {
      return NextResponse.json({ 
        error: 'No se pudo extraer texto del archivo',
        details: 'El archivo está vacío o no contiene texto extraíble'
      }, { status: 400 })
    }

    // Limitar tamaño total del contenido
    if (content.length > 500000) {
      console.log(`[WARNING] Contenido muy largo (${content.length} chars), truncando a 500k`)
      content = content.substring(0, 500000)
    }

    // Crear documento en BD
    const document = await prisma.legalDocument.create({
      data: {
        title,
        documentType: 'documento', // Tipo por defecto
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
  } catch (error: any) {
    console.error('[Documents] Error al subir:', error)
    return NextResponse.json({ 
      error: 'Error al procesar documento',
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}

// Función auxiliar para dividir contenido en secciones
async function createSections(documentId: string, content: string) {
  try {
    const sections: Array<{ title: string; content: string; order: number }> = []
    
    // Dividir por artículos o temas (lógica básica)
    const articlePattern = /(?:Artículo|Art\.|Tema|TEMA)\s+(\d+[.\-]?\d*)[:\s]+(.*?)(?=(?:Artículo|Art\.|Tema|TEMA)\s+\d+|$)/gis
    const matches = content.matchAll(articlePattern)
    
    let order = 0
    for (const match of matches) {
      const number = match[1]
      const sectionContent = match[0]
      
      if (sectionContent.length > 100 && sectionContent.length < 50000) { // Limitar tamaño
        sections.push({
          title: `Artículo ${number}`,
          content: sectionContent.substring(0, 50000), // Limitar a 50k caracteres
          order: order++
        })
      }
    }

    // Si no se encontraron secciones, dividir por párrafos largos
    if (sections.length === 0) {
      const paragraphs = content.split(/\n\n+/)
      let validParas = 0
      paragraphs.forEach((para, idx) => {
        if (para.trim().length > 200 && para.trim().length < 50000) {
          sections.push({
            title: `Sección ${validParas + 1}`,
            content: para.trim().substring(0, 50000),
            order: validParas
          })
          validParas++
        }
      })
    }

    // Si aún no hay secciones, crear una sección con todo el contenido
    if (sections.length === 0) {
      sections.push({
        title: 'Contenido completo',
        content: content.substring(0, 50000),
        order: 0
      })
    }

    // Guardar secciones (máximo 100)
    if (sections.length > 0) {
      const sectionsToSave = sections.slice(0, 100)
      await prisma.documentSection.createMany({
        data: sectionsToSave.map(s => ({
          ...s,
          documentId
        }))
      })
    }
  } catch (error) {
    console.error('[createSections] Error:', error)
    // No lanzar error, solo log - el documento ya está creado
  }
}
