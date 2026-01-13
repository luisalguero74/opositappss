import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processDocument } from '@/lib/document-processor'
import { prisma } from '@/lib/prisma'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'

interface FileToProcess {
  filePath: string
  fileName: string
  type: string
  topic?: string
}

async function findAllDocuments(): Promise<FileToProcess[]> {
  const documents: FileToProcess[] = []
  const basePath = join(process.cwd(), 'documentos-temario')

  try {
    // Procesar documentos de biblioteca
    const bibliotecaPath = join(basePath, 'biblioteca')
    try {
      const bibliotecaFiles = await readdir(bibliotecaPath)
      for (const file of bibliotecaFiles) {
        if (file.match(/\.(txt|pdf|doc|docx)$/i)) {
          documents.push({
            filePath: `documentos-temario/biblioteca/${file}`,
            fileName: file,
            type: 'ley'
          })
        }
      }
    } catch (error) {
      console.log('No se encontró directorio biblioteca')
    }

    // Procesar temario general
    const generalPath = join(basePath, 'general')
    try {
      const generalFiles = await readdir(generalPath)
      for (const file of generalFiles) {
        if (file.match(/\.(txt|pdf|doc|docx)$/i) && !file.includes('README')) {
          const match = file.match(/tema[_\s]?(\d+)/i)
          const temaNum = match ? parseInt(match[1]) : undefined
          
          documents.push({
            filePath: `documentos-temario/general/${file}`,
            fileName: file,
            type: 'temario_general',
            topic: temaNum ? `Tema ${temaNum}` : undefined
          })
        }
      }
    } catch (error) {
      console.log('No se encontró directorio general')
    }

    // Procesar temario específico
    const especificoPath = join(basePath, 'especifico')
    try {
      const especificoFiles = await readdir(especificoPath)
      for (const file of especificoFiles) {
        if (file.match(/\.(txt|pdf|doc|docx)$/i) && !file.includes('README')) {
          const match = file.match(/tema[_\s]?(\d+)/i)
          const temaNum = match ? parseInt(match[1]) : undefined
          
          documents.push({
            filePath: `documentos-temario/especifico/${file}`,
            fileName: file,
            type: 'temario_especifico',
            topic: temaNum ? `Tema ${24 + temaNum}` : undefined // Los temas específicos empiezan en 24
          })
        }
      }
    } catch (error) {
      console.log('No se encontró directorio especifico')
    }
  } catch (error) {
    console.error('Error buscando documentos:', error)
  }

  return documents
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { action = 'scan', generateQuestions = false } = body

    if (action === 'scan') {
      const documents = await findAllDocuments()
      return NextResponse.json({
        success: true,
        count: documents.length,
        documents
      })
    }

    if (action === 'process-all') {
      const documents = await findAllDocuments()
      const results = {
        processed: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const doc of documents) {
        try {
          // Verificar si ya existe
          const existing = await prisma.legalDocument.findFirst({
            where: { fileName: doc.fileName }
          })

          if (existing) {
            console.log(`Documento ya procesado: ${doc.fileName}`)
            continue
          }

          console.log(`Procesando: ${doc.fileName}`)
          const processed = await processDocument(doc.filePath, doc.fileName)

          const fullPath = join(process.cwd(), doc.filePath)
          const fileStats = await stat(fullPath)

          await prisma.legalDocument.create({
            data: {
              title: doc.fileName.replace(/\.[^/.]+$/, ''),
              documentType: doc.type,
              topic: doc.topic,
              fileName: doc.fileName,
              fileSize: fileStats.size,
              content: processed.content,
              processedAt: new Date(),
              sections: {
                create: processed.sections.map(section => ({
                  title: section.title,
                  content: section.content,
                  order: section.order
                }))
              }
            }
          })

          results.processed++
          console.log(`✅ Procesado: ${doc.fileName}`)
        } catch (error: any) {
          console.error(`❌ Error en ${doc.fileName}:`, error.message)
          results.failed++
          results.errors.push(`${doc.fileName}: ${error.message}`)
        }
      }

      return NextResponse.json({
        success: true,
        results
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en procesamiento masivo:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar' },
      { status: 500 }
    )
  }
}
