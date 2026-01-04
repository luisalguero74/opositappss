/**
 * Script para procesar automáticamente todos los documentos del temario
 * Usa las librerías directamente sin pasar por la API
 */

import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import { processDocument } from '../src/lib/document-processor'
import { prisma } from '../src/lib/prisma'

const TEMARIOS_DIR = join(process.cwd(), 'documentos-temario')

interface DocumentInfo {
  path: string
  fileName: string
  category: string
  topic: string
}

// Función para encontrar todos los documentos
function findAllDocuments(): DocumentInfo[] {
  const documents: DocumentInfo[] = []
  
  // Procesar temario general
  const generalDir = join(TEMARIOS_DIR, 'general')
  try {
    const generalFiles = readdirSync(generalDir)
    generalFiles.forEach((file) => {
      const filePath = join(generalDir, file)
      if (statSync(filePath).isFile() && (file.endsWith('.txt') || file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))) {
        const topicMatch = file.match(/[Tt]ema\s*(\d+)/i)
        const topicNumber = topicMatch ? topicMatch[1] : '?'
        documents.push({
          path: filePath,
          fileName: file,
          category: 'temario_general',
          topic: `Tema ${topicNumber}`
        })
      }
    })
  } catch (error) {
    console.error('Error leyendo directorio general:', error)
  }
  
  // Procesar temario específico
  const especificoDir = join(TEMARIOS_DIR, 'especifico')
  try {
    const especificoFiles = readdirSync(especificoDir)
    especificoFiles.forEach((file) => {
      const filePath = join(especificoDir, file)
      if (statSync(filePath).isFile() && (file.endsWith('.txt') || file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))) {
        const topicMatch = file.match(/[Tt]ema\s*(\d+)/i)
        const topicNumber = topicMatch ? parseInt(topicMatch[1]) + 23 : '?'  // Específico empieza en tema 24
        documents.push({
          path: filePath,
          fileName: file,
          category: 'temario_especifico',
          topic: `Tema ${topicNumber}`
        })
      }
    })
  } catch (error) {
    console.error('Error leyendo directorio específico:', error)
  }
  
  // Procesar biblioteca legal
  const bibliotecaDir = join(TEMARIOS_DIR, 'biblioteca')
  try {
    const bibliotecaFiles = readdirSync(bibliotecaDir)
    bibliotecaFiles.forEach((file) => {
      const filePath = join(bibliotecaDir, file)
      if (statSync(filePath).isFile() && (file.endsWith('.txt') || file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))) {
        documents.push({
          path: filePath,
          fileName: file,
          category: 'ley',
          topic: file.replace(/\.(txt|pdf|doc|docx)$/, '')
        })
      }
    })
  } catch (error) {
    console.error('Error leyendo directorio biblioteca:', error)
  }
  
  return documents
}

// Función principal
async function main() {
  console.log('🚀 Iniciando procesamiento de documentos...\n')
  
  const documents = findAllDocuments()
  console.log(`📚 Encontrados ${documents.length} documentos\n`)
  
  let processed = 0
  let failed = 0
  
  for (const doc of documents) {
    try {
      console.log(`📄 Procesando: ${doc.fileName}`)
      console.log(`   Categoría: ${doc.category}`)
      console.log(`   Tema: ${doc.topic}`)
      
      // Procesar el documento
      const result = await processDocument(doc.path, doc.fileName)
      
      if (!result) {
        console.log(`   ⚠️  No se pudo procesar (formato no soportado o archivo vacío)`)
        failed++
        continue
      }
      
      // Guardar en la base de datos
      const legalDoc = await prisma.legalDocument.create({
        data: {
          title: doc.fileName,
          content: result.content,
          type: doc.category,
          topic: doc.topic,
          fileName: doc.fileName,
          fileSize: result.content.length,
          processedAt: new Date()
        }
      })
      
      // Guardar secciones si existen
      if (result.sections && result.sections.length > 0) {
        await prisma.documentSection.createMany({
          data: result.sections.map((section, index) => ({
            documentId: legalDoc.id,
            title: section.title,
            content: section.content,
            order: section.order || index
          }))
        })
        
        console.log(`   ✅ Procesado: ${result.sections.length} secciones, ${result.content.length} caracteres`)
      } else {
        console.log(`   ✅ Procesado: ${result.content.length} caracteres`)
      }
      
      processed++
      
    } catch (error) {
      console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)
      failed++
    }
    
    console.log('')
  }
  
  console.log('============================================')
  console.log('📊 RESUMEN')
  console.log('============================================')
  console.log(`✅ Procesados exitosamente: ${processed}`)
  console.log(`❌ Fallidos: ${failed}`)
  console.log(`📚 Total: ${documents.length}`)
  console.log('')
  console.log('🎯 Siguiente paso:')
  console.log('   1. Ve a: http://localhost:3000/admin/ai-documents')
  console.log('   2. Verifica los documentos procesados')
  console.log('   3. Genera preguntas con: 🤖 Generar Preguntas')
  console.log('')
}

// Ejecutar
main()
  .catch((error) => {
    console.error('Error fatal:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
