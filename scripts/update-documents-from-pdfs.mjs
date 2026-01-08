#!/usr/bin/env node
/**
 * Script para actualizar contenido de documentos desde PDFs locales
 * 
 * Uso: node scripts/update-documents-from-pdfs.mjs
 */

import { config } from 'dotenv'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Cargar variables de entorno desde .env
config()

const BIBLIOTECA_DIR = './documentos-temario/biblioteca'
const API_URL = process.env.PRODUCTION_URL || 'https://opositappss.vercel.app'
const API_ENDPOINT = `${API_URL}/api/admin/update-document-content`

// API Key para autenticación (más simple que cookies)
const API_KEY = process.env.ADMIN_API_KEY || ''

async function extractPDFContent(filePath) {
  try {
    const pdfParse = (await import('pdf-parse-fork')).default
    const buffer = await readFile(filePath)
    const pdfData = await pdfParse(buffer)
    return pdfData.text
  } catch (error) {
    console.error(`Error extrayendo PDF ${filePath}:`, error.message)
    return null
  }
}

async function extractTXTContent(filePath) {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    console.error(`Error leyendo TXT ${filePath}:`, error.message)
    return null
  }
}

async function extractEPUBContent(filePath) {
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
            const chapterText = await new Promise((res, rej) => {
              epub.getChapter(chapterId, (error, text) => {
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
      epub.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
      epub.parse()
    })
  } catch (error) {
    console.error(`Error extrayendo EPUB ${filePath}:`, error.message)
    return null
  }
}

async function updateDocument(fileName, content) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify({ fileName, content })
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error(`   ⚠️  HTTP ${response.status}: ${responseText.substring(0, 200)}`)
      return null
    }

    try {
      const data = JSON.parse(responseText)
      return data
    } catch (parseError) {
      console.error(`   ⚠️  Respuesta no es JSON: ${responseText.substring(0, 200)}`)
      return null
    }
  } catch (error) {
    console.error(`   ⚠️  Error de red: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('🚀 Iniciando actualización de documentos desde PDFs locales...\n')

  if (!API_KEY) {
    console.error('❌ ERROR: Necesitas configurar ADMIN_API_KEY')
    console.log('\n📋 PASOS SIMPLES:')
    console.log('1. Abre el archivo .env en la raíz del proyecto')
    console.log('2. Busca la línea ADMIN_API_KEY=...')
    console.log('3. Copia ese valor')
    console.log('4. En tu terminal, ejecuta:')
    console.log('   export ADMIN_API_KEY="el_valor_que_copiaste"')
    console.log('5. Vuelve a ejecutar: node scripts/update-documents-from-pdfs.mjs\n')
    console.log('💡 Tip: Está en el mismo .env donde pusiste OPENAI_API_KEY\n')
    process.exit(1)
  }

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
    const ext = fileName.split('.').pop().toLowerCase()

    console.log(`📄 Procesando: ${fileName}`)

    // Extraer contenido según tipo
    let content = null
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

    console.log(`   📊 ${content.length} caracteres extraídos`)

    // Actualizar en BD
    const result = await updateDocument(fileName, content)
    
    if (result) {
      console.log(`   ✅ Actualizado: ${result.documentId}`)
      if (result.embeddingGenerated) {
        console.log(`   🔍 Embedding generado`)
      }
      processed++
    } else {
      console.log(`   ❌ Error actualizando`)
      errors++
    }

    console.log('')

    // Pausa de 1 segundo entre documentos para no saturar
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n🎉 Proceso completado!')
  console.log(`✅ Procesados: ${processed}`)
  console.log(`❌ Errores: ${errors}`)
  console.log(`⏭️  Saltados: ${skipped}`)
  console.log(`📊 Total: ${documentFiles.length}\n`)
}

main().catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})
