import { PrismaClient } from '@prisma/client'
import { generateEmbedding, serializeEmbedding } from '../src/lib/embeddings'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Generando embeddings para documentos y secciones existentes...\n')

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY no configurada')
    console.error('   Configura la variable de entorno:')
    console.error('   export OPENAI_API_KEY="sk-..."')
    process.exit(1)
  }

  // 1. Generar embeddings para documentos
  console.log('📄 Procesando documentos...')
  const documents = await prisma.legalDocument.findMany({
    where: {
      OR: [
        { embedding: null },
        { embedding: '' }
      ]
    },
    select: {
      id: true,
      title: true,
      content: true
    }
  })

  console.log(`   Encontrados ${documents.length} documentos sin embedding\n`)

  let processedDocs = 0
  let failedDocs = 0

  for (const doc of documents) {
    try {
      console.log(`   Procesando: ${doc.title.substring(0, 60)}...`)
      
      // Generar embedding del contenido (truncado a 32k chars)
      const textForEmbedding = `${doc.title}\n\n${doc.content}`.substring(0, 32000)
      const embedding = await generateEmbedding(textForEmbedding)
      
      if (embedding.length > 0) {
        // Guardar en base de datos
        await prisma.legalDocument.update({
          where: { id: doc.id },
          data: {
            embedding: serializeEmbedding(embedding)
          }
        })
        
        processedDocs++
        console.log(`   ✅ Embedding guardado (${embedding.length} dims)\n`)
      } else {
        failedDocs++
        console.log(`   ⚠️  No se pudo generar embedding\n`)
      }
      
      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error: any) {
      failedDocs++
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }

  // 2. Generar embeddings para secciones
  console.log('\n📑 Procesando secciones...')
  const sections = await prisma.documentSection.findMany({
    where: {
      OR: [
        { embedding: null },
        { embedding: '' }
      ]
    },
    select: {
      id: true,
      title: true,
      content: true,
      document: {
        select: {
          title: true
        }
      }
    }
  })

  console.log(`   Encontradas ${sections.length} secciones sin embedding\n`)

  let processedSections = 0
  let failedSections = 0

  for (const section of sections) {
    try {
      if (!section.document) {
        console.log(`   ⚠️  Sección ${section.id} sin documento asociado, saltando...\n`)
        continue
      }

      console.log(`   Procesando: ${section.document.title} - ${section.title.substring(0, 40)}...`)
      
      // Generar embedding del contenido de la sección
      const textForEmbedding = `${section.document.title} - ${section.title}\n\n${section.content}`.substring(0, 32000)
      const embedding = await generateEmbedding(textForEmbedding)
      
      if (embedding.length > 0) {
        // Guardar en base de datos
        await prisma.documentSection.update({
          where: { id: section.id },
          data: {
            embedding: serializeEmbedding(embedding)
          }
        })
        
        processedSections++
        console.log(`   ✅ Embedding guardado (${embedding.length} dims)\n`)
      } else {
        failedSections++
        console.log(`   ⚠️  No se pudo generar embedding\n`)
      }
      
      // Pequeña pausa para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error: any) {
      failedSections++
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('✨ RESUMEN')
  console.log('='.repeat(60))
  console.log(`\n📄 Documentos:`)
  console.log(`   ✅ Procesados: ${processedDocs}`)
  console.log(`   ❌ Fallidos: ${failedDocs}`)
  console.log(`\n📑 Secciones:`)
  console.log(`   ✅ Procesadas: ${processedSections}`)
  console.log(`   ❌ Fallidas: ${failedSections}`)
  console.log(`\n🎯 Total exitoso: ${processedDocs + processedSections}`)
  console.log(`💰 Costo aproximado: $${((processedDocs + processedSections) * 0.00002).toFixed(4)} USD`)
  console.log('\n' + '='.repeat(60))
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (e) => {
    console.error('❌ Error fatal:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
