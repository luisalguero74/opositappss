/**
 * Script para actualizar contenido de documentos desde PDFs locales
 * Usa Prisma directamente (no requiere cookies ni API)
 * 
 * Uso: npx tsx scripts/update-documents-local.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { generateEmbedding } from '../src/lib/embeddings'

const prisma = new PrismaClient()
const BIBLIOTECA_DIR = './documentos-temario/biblioteca'

async function extractPDFContent(filePath: string): Promise<string | null> {
  try {
    const pdfParse = (await import('pdf-parse-fork')).default
    const buffer = await readFile(filePath)
    const pdfData = await pdfParse(buffer)
    return pdfData.text
  } catch (error: any) {
    console.error(`Error extrayendo PDF ${filePath}:`, error.message)
    return null
  }
}

async function extractTXTContent(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error: any) {
    console.error(`Error leyendo TXT ${filePath}:`, error.message)
    return null
  }
}

async function extractEPUBContent(filePath: string): Promise<string | null> {
  try {
    const EPub = (await import('epub')).default
    const buffer = await readFile(filePath)
    const epub = new EPub(buffer)
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000)

      epub.on('end', async () => {
        try {
          clearTimeout(timeout)
          const chapters = epub.flow.map(chapter => chapter.id)
          let fullText = ''
          
          for (const chapterId of chapters.slice(0, 200)) {
            const chapterText = await new Promise<string>((res, rej) => {
              epub.getChapter(chapterId, (error: any, text: string) => {
                if (error) rej(error)
                else {
                  const cleanText = text.replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
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
  } catch (error: any) {
    console.error(`Error extrayendo EPUB ${filePath}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🚀 Iniciando actualización de documentos desde PDFs locales...\n')

  if (!existsSync(BIBLIOTECA_DIR)) {
    console.error(`❌ Carpeta no encontrada: ${BIBLIOTECA_DIR}`)
    process.exit(1)
  }

  // Obtener todos los archivos
  const files = await readdir(BIBLIOTECA_DIR)
  const documentFiles = files.filter(f => 
    f.endsWith('.pdf') || f.endsWith('.txt') || f.endsWith('.epub')
  )

  console.log(`📁 Encontrados ${documentFiles.length} documentos\n`)

  let processed = 0
  let errors = 0
  let skipped = 0

  for (const fileName of documentFiles) {
    const filePath = join(BIBLIOTECA_DIR, fileName)
    const ext = fileName.split('.').pop()?.toLowerCase()

    console.log(`📄 Procesando: ${fileName}`)

    // Buscar documento en BD
    const document = await prisma.legalDocument.findFirst({
      where: { fileName }
    })

    if (!document) {
      console.log(`   ⚠️  No encontrado en BD, saltando...\n`)
      skipped++
      continue
    }

    // Extraer contenido según tipo
    let content: string | null = null
    if (ext === 'pdf') {
      content = await extractPDFContent(filePath)
    } else if (ext === 'txt') {
      content = await extractTXTContent(filePath)
    } else if (ext === 'epub') {
      content = await extractEPUBContent(filePath)
    }

    if (!content || content.length < 100) {
      console.log(`   ⏭️  Sin contenido extraíble, saltando...\n`)
      skipped++
      continue
    }

    // Limitar a 500k caracteres
    if (content.length > 500000) {
      content = content.substring(0, 500000)
    }

    console.log(`   📊 ${content.length} caracteres extraídos`)

    try {
      // Actualizar contenido
      await prisma.legalDocument.update({
        where: { id: document.id },
        data: { content }
      })

      console.log(`   ✅ Contenido actualizado`)

      // Generar embedding
      try {
        const embedding = await generateEmbedding(content)
        await prisma.legalDocument.update({
          where: { id: document.id },
          data: { embedding: JSON.stringify(embedding) }
        })
        console.log(`   🔍 Embedding generado`)
      } catch (embError: any) {
        console.log(`   ⚠️  Error generando embedding: ${embError.message}`)
      }

      processed++
    } catch (error: any) {
      console.log(`   ❌ Error actualizando: ${error.message}`)
      errors++
    }

    console.log('')

    // Pausa de 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n🎉 Proceso completado!')
  console.log(`✅ Procesados: ${processed}`)
  console.log(`❌ Errores: ${errors}`)
  console.log(`⏭️  Saltados: ${skipped}`)
  console.log(`📊 Total: ${documentFiles.length}\n`)

  await prisma.$disconnect()
}

main().catch(error => {
  console.error('💥 Error fatal:', error)
  prisma.$disconnect()
  process.exit(1)
})
