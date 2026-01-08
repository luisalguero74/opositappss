/**
 * Script de migración: Biblioteca Legal (JSON) → Prisma (PostgreSQL)
 * 
 * Migra los documentos de data/biblioteca-legal.json a la tabla LegalDocument
 * y crea las relaciones con TemaOficial en TemaLegalDocument
 */

import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
    [temaId: string]: string[] // temaId → [documentoIds]
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

      // Crear nuevo documento
      const newDoc = await prisma.legalDocument.create({
        data: {
          title: doc.nombre,
          type: doc.tipo || 'ley',
          fileName: doc.archivo,
          fileSize: doc.numeroPaginas * 1024, // Estimación: 1KB por página
          content: `Documento migrado de Biblioteca Legal: ${doc.nombre}`,
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
