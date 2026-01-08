import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const prisma = new PrismaClient()
const BIBLIOTECA_DIR = join(process.cwd(), 'documentos-temario', 'biblioteca')

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

        // Crear documento (SIN campo type - columna no existe en BD producción)
        const newDoc = await prisma.legalDocument.create({
          data: {
            title: doc.nombre,
            // type: doc.tipo || 'ley', // REMOVIDO - columna no existe en producción
            fileName: doc.archivo,
            fileSize: doc.numeroPaginas * 1024,
            content: content.substring(0, 500000),
            active: true,
            processedAt: new Date(doc.fechaActualizacion || Date.now())
          }
        })

        documentMap.set(doc.id, newDoc.id)
        logs.push(`✅ Migrado: ${doc.nombre}`)
      } catch (error: any) {
        logs.push(`❌ Error: ${doc.nombre} - ${error.message}`)
      }
    }

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
