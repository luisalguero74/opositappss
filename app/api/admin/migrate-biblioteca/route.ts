import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { join } from 'path'

const prisma = new PrismaClient()

interface BibliotecaJSON {
  documentos: Array<{
    id: string
    nombre: string
    archivo: string
    tipo: string
    numeroPaginas: number
    fechaActualizacion: string
  }>
  relaciones: {
    [temaId: string]: string[]
  }
}

// Extraer contenido de archivo según tipo
async function extractContent(filePath: string): Promise<string> {
  const extension = filePath.split('.').pop()?.toLowerCase()

  const { readFile } = await import('fs/promises')

  try {
    if (extension === 'txt') {
      const content = await readFile(filePath, 'utf-8')
      return content
    }

    if (extension === 'pdf') {
      const pdfParse = require('pdf-parse-fork')
      const buffer = await readFile(filePath)
      const pdfData = await pdfParse(buffer)
      return pdfData.text
    }

    if (extension === 'epub') {
      const EPub = require('epub')
      const buffer = await readFile(filePath)
      const epub = new EPub(buffer)
      
      const content = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout EPUB')), 30000)

        epub.on('end', async () => {
          try {
            clearTimeout(timeout)
            const chapters = epub.flow.map((chapter: any) => chapter.id)
            let fullText = ''
            
            for (const chapterId of chapters.slice(0, 200)) {
              const chapterText = await new Promise<string>((res, rej) => {
                epub.getChapter(chapterId, (error: any, text: string) => {
                  if (error) rej(error)
                  else {
                    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    res(cleanText)
                  }
                })
              })
              fullText += chapterText + '\n\n'
              if (fullText.length > 500000) break
            }
            
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

      return content
    }

    throw new Error(`Formato no soportado: ${extension}`)
  } catch (error: any) {
    return `Error al extraer contenido: ${error.message}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            'Migración no soportada en producción (Vercel). Este endpoint depende de archivos locales. Ejecuta la migración desde local/NAS.',
        },
        { status: 501 }
      )
    }

    const [{ readFile }, { existsSync }] = await Promise.all([import('fs/promises'), import('fs')])
    const { getLocalBibliotecaDir } = await import('@/lib/local-documentos-temario')
    const BIBLIOTECA_DIR = getLocalBibliotecaDir()

    const BIBLIOTECA_PATH = join(process.cwd(), 'data', 'biblioteca-legal.json')

    if (!existsSync(BIBLIOTECA_PATH)) {
      return NextResponse.json({ 
        error: 'No se encontró data/biblioteca-legal.json',
        message: 'No hay nada que migrar'
      }, { status: 404 })
    }

    // Leer JSON
    const jsonData = await readFile(BIBLIOTECA_PATH, 'utf-8')
    const biblioteca: BibliotecaJSON = JSON.parse(jsonData)
    
    const logs: string[] = []
    logs.push(`📖 ${biblioteca.documentos.length} documentos encontrados`)
    logs.push(`📋 ${Object.keys(biblioteca.relaciones).length} temas con relaciones`)

    // Migrar documentos
    const documentMap = new Map<string, string>()
    
    // Primero verificar cuántos docs hay en total
    const totalExistentes = await prisma.legalDocument.count()
    logs.push(`📊 Documentos existentes en BD antes de migrar: ${totalExistentes}`)

    for (const doc of biblioteca.documentos) {
      try {
        // Verificar si ya existe
        const existing = await prisma.legalDocument.findFirst({
          where: { fileName: doc.archivo }
        })

        if (existing) {
          documentMap.set(doc.id, existing.id)
          logs.push(`⏭️  Ya existe: ${doc.nombre} (${existing.id})`)
          continue
        }

        // Extraer contenido del archivo físico
        const filePath = join(BIBLIOTECA_DIR, doc.archivo)
        let content = `Documento migrado de Biblioteca Legal: ${doc.nombre}`
        
        if (existsSync(filePath)) {
          logs.push(`📂 Procesando: ${doc.archivo}`)
          content = await extractContent(filePath)
        } else {
          logs.push(`⚠️  Archivo no encontrado: ${filePath}`)
        }

        // Crear documento con schema correcto de producción
        logs.push(`🆕 Creando nuevo documento: ${doc.nombre}`)
        const newDoc = await prisma.legalDocument.create({
          data: {
            title: doc.nombre,
            documentType: doc.tipo || 'ley', // REQUIRED - usar documentType en vez de type
            content: content.substring(0, 500000),
            metadata: JSON.stringify({ 
              numeroPaginas: doc.numeroPaginas,
              fechaActualizacion: doc.fechaActualizacion 
            }),
            fileName: doc.archivo,
            fileSize: doc.numeroPaginas * 1024,
            active: true,
            processedAt: new Date(doc.fechaActualizacion || Date.now())
          }
        })

        documentMap.set(doc.id, newDoc.id)
        logs.push(`✅ Creado: ${doc.nombre} → ${newDoc.id}`)
      } catch (error: any) {
        logs.push(`❌ Error: ${doc.nombre} - ${error.message}`)
        console.error(`Error migrando ${doc.nombre}:`, error)
      }
    }
    
    // Verificar cuántos docs hay después
    const totalDespues = await prisma.legalDocument.count()
    logs.push(`📊 Documentos en BD después de migrar: ${totalDespues}`)

    // Migrar relaciones
    let relacionesCreadas = 0

    for (const [temaId, documentosIds] of Object.entries(biblioteca.relaciones)) {
      const tema = await prisma.temaOficial.findUnique({ where: { id: temaId } })
      if (!tema) {
        logs.push(`⚠️  Tema no encontrado: ${temaId}`)
        continue
      }

      for (const oldDocId of documentosIds) {
        const newDocId = documentMap.get(oldDocId)
        if (!newDocId) continue

        try {
          await prisma.temaLegalDocument.create({
            data: { temaId, documentId: newDocId }
          })
          relacionesCreadas++
        } catch (error: any) {
          if (error.code !== 'P2002') {
            logs.push(`❌ Relación: ${error.message}`)
          }
        }
      }
    }

    logs.push(`✅ ${documentMap.size} documentos migrados`)
    logs.push(`✅ ${relacionesCreadas} relaciones creadas`)
    
    // Resumen final
    const yaExistentes = biblioteca.documentos.length - documentMap.size
    if (yaExistentes > 0) {
      logs.push(`ℹ️  ${yaExistentes} documentos ya existían en la base de datos`)
    }
    
    logs.push(`🎉 Migración completada`)

    return NextResponse.json({ 
      success: true,
      logs,
      documentosMigrados: documentMap.size,
      documentosExistentes: yaExistentes,
      relacionesCreadas,
      totalDocumentos: biblioteca.documentos.length
    })
  } catch (error: any) {
    console.error('Error en migración:', error)
    return NextResponse.json({ 
      error: 'Error en la migración',
      details: error.message 
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
