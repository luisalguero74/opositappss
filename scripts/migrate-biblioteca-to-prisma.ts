/**
 * Script de migración: Biblioteca Legal (JSON) → Prisma (PostgreSQL)
 * 
 * Migra los documentos de data/biblioteca-legal.json a la tabla LegalDocument
 * Lee los archivos físicos (PDF/TXT/EPUB) de documentos-temario/biblioteca/
 * Extrae contenido y crea las relaciones con TemaOficial en TemaLegalDocument
 */

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
    [temaId: string]: string[] // temaId → [documentoIds]
  }
}

// Extraer contenido de archivo según tipo
async function extractContent(filePath: string): Promise<string> {
  const extension = filePath.split('.').pop()?.toLowerCase()

  try {
    if (extension === 'txt') {
      // Archivo TXT
      const content = await readFile(filePath, 'utf-8')
      console.log(`      📄 TXT: ${content.length} caracteres extraídos`)
      return content
    }

    if (extension === 'pdf') {
      // Archivo PDF
      const pdfParse = require('pdf-parse-fork')
      const buffer = await readFile(filePath)
      const pdfData = await pdfParse(buffer)
      console.log(`      📕 PDF: ${pdfData.text.length} caracteres extraídos`)
      return pdfData.text
    }

    if (extension === 'epub') {
      // Archivo EPUB
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
            
            console.log(`      📚 EPUB: ${fullText.length} caracteres extraídos`)
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
    console.error(`      ❌ Error extrayendo contenido: ${error.message}`)
    return `Error al extraer contenido de ${filePath}`
  }
}

async function migrateBiblioteca() {
  console.log('🚀 Iniciando migración de Biblioteca Legal...\n')

  const BIBLIOTECA_PATH = join(process.cwd(), 'data', 'biblioteca-legal.json')

  if (!existsSync(BIBLIOTECA_PATH)) {
    console.log('❌ No se encontró data/biblioteca-legal.json')
    console.log('ℹ️  No hay nada que migrar. Terminando.')
    return
  }

  // 1. Leer JSON
  console.log('📖 Leyendo data/biblioteca-legal.json...')
  const jsonData = await readFile(BIBLIOTECA_PATH, 'utf-8')
  const biblioteca: BibliotecaJSON = JSON.parse(jsonData)
  
  console.log(`   ✅ ${biblioteca.documentos.length} documentos encontrados`)
  console.log(`   ✅ ${Object.keys(biblioteca.relaciones).length} temas con relaciones\n`)

  // 2. Migrar documentos
  console.log('📝 Migrando documentos a LegalDocument...')
  const documentMap = new Map<string, string>() // oldId → newId

  for (const doc of biblioteca.documentos) {
    try {
      // Verificar si ya existe por nombre de archivo
      const existing = await prisma.legalDocument.findFirst({
        where: { fileName: doc.archivo }
      })

      if (existing) {
        console.log(`   ⏭️  Ya existe: ${doc.nombre}`)
        documentMap.set(doc.id, existing.id)
        continue
      }

      // Intentar extraer contenido del archivo físico
      const filePath = join(BIBLIOTECA_DIR, doc.archivo)
      let content = `Documento migrado de Biblioteca Legal: ${doc.nombre}`
      
      if (existsSync(filePath)) {
        console.log(`   📂 Procesando archivo: ${doc.archivo}`)
        content = await extractContent(filePath)
      } else {
        console.log(`   ⚠️  Archivo no encontrado: ${filePath}`)
      }

      // Crear nuevo documento
      const newDoc = await prisma.legalDocument.create({
        data: {
          title: doc.nombre,
          type: doc.tipo || 'ley',
          fileName: doc.archivo,
          fileSize: doc.numeroPaginas * 1024, // Estimación: 1KB por página
          content: content.substring(0, 500000), // Limitar a 500k caracteres
          active: true,
          processedAt: new Date(doc.fechaActualizacion || Date.now())
        }
      })

      documentMap.set(doc.id, newDoc.id)
      console.log(`   ✅ Migrado: ${doc.nombre} → ${newDoc.id}`)
    } catch (error: any) {
      console.error(`   ❌ Error migrando ${doc.nombre}:`, error.message)
    }
  }

  console.log(`\n✅ ${documentMap.size} documentos migrados\n`)

  // 3. Migrar relaciones Tema ↔ Documento
  console.log('🔗 Creando relaciones TemaLegalDocument...')
  let relacionesCreadas = 0

  for (const [temaId, documentosIds] of Object.entries(biblioteca.relaciones)) {
    // Verificar que el tema existe
    const tema = await prisma.temaOficial.findUnique({ where: { id: temaId } })
    if (!tema) {
      console.log(`   ⚠️  Tema no encontrado: ${temaId}, saltando...`)
      continue
    }

    for (const oldDocId of documentosIds) {
      const newDocId = documentMap.get(oldDocId)
      if (!newDocId) {
        console.log(`   ⚠️  Documento no encontrado: ${oldDocId}`)
        continue
      }

      try {
        // Crear relación (evitar duplicados con @@unique)
        await prisma.temaLegalDocument.create({
          data: {
            temaId,
            documentId: newDocId
          }
        })
        relacionesCreadas++
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Relación ya existe, OK
          console.log(`   ⏭️  Relación ya existe: ${tema.titulo} ↔ ${oldDocId}`)
        } else {
          console.error(`   ❌ Error creando relación:`, error.message)
        }
      }
    }
  }

  console.log(`\n✅ ${relacionesCreadas} relaciones creadas\n`)

  console.log('🎉 Migración completada exitosamente!')
  console.log('\nℹ️  El archivo data/biblioteca-legal.json NO ha sido eliminado.')
  console.log('   Puedes guardarlo como backup y eliminar manualmente si todo funciona bien.')
  
  // Opción para generar embeddings
  console.log('\n💡 SIGUIENTE PASO RECOMENDADO:')
  console.log('   Ejecuta: npm run generate-embeddings')
  console.log('   O desde admin: Panel "Generar Embeddings" → Botón "🚀 Generar Todos"')
  console.log('\n   Esto habilitará búsqueda semántica en todos los documentos migrados.')
}

// Ejecutar migración
migrateBiblioteca()
  .catch((error) => {
    console.error('💥 Error fatal en la migración:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
