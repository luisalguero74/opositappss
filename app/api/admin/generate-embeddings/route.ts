import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { generateEmbedding } from '@/lib/embeddings'

const prisma = new PrismaClient()

/**
 * Genera embeddings vectoriales para documentos
 * POST /api/admin/generate-embeddings
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación admin
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const mode = body.mode || 'all' // 'all' | 'missing'

    console.log(`🔍 Generando embeddings (modo: ${mode})...`)

    // Obtener documentos a procesar
    let documents
    if (mode === 'missing') {
      // Solo documentos sin embeddings
      documents = await prisma.legalDocument.findMany({
        where: {
          OR: [
            { embedding: null },
            { embedding: { equals: '' } }
          ]
        },
        include: {
          sections: {
            select: {
              content: true
            }
          }
        }
      })
    } else {
      // Todos los documentos
      documents = await prisma.legalDocument.findMany({
        include: {
          sections: {
            select: {
              content: true
            }
          }
        }
      })
    }

    console.log(`📄 Documentos a procesar: ${documents.length}`)

    let processed = 0
    let skipped = 0
    let errors = 0
    let totalTokens = 0

    for (const doc of documents) {
      try {
        // Construir texto completo del documento
        let fullText = `${doc.title}\n\n`
        
        if (doc.reference) {
          fullText += `Referencia: ${doc.reference}\n`
        }
        
        if (doc.topic) {
          fullText += `Tema: ${doc.topic}\n`
        }
        
        fullText += `\nContenido:\n`
        
        // Añadir contenido de las secciones
        const sectionContents = doc.sections.map(s => s.content).join('\n\n')
        fullText += sectionContents

        // Limitar a ~8000 palabras (32k caracteres aproximadamente)
        const textToEmbed = fullText.substring(0, 32000)
        
        console.log(`  📝 [${doc.title}] Generando embedding (${textToEmbed.length} caracteres)...`)
        
        // Generar embedding
        const embedding = await generateEmbedding(textToEmbed)
        
        if (!embedding || embedding.length === 0) {
          console.warn(`  ⚠️ [${doc.title}] No se pudo generar embedding (API key?)`)
          skipped++
          continue
        }

        // Guardar en base de datos como string JSON
        await prisma.legalDocument.update({
          where: { id: doc.id },
          data: { embedding: JSON.stringify(embedding) }
        })

        // Estimar tokens (aproximadamente 1 token = 4 caracteres)
        const estimatedTokens = Math.ceil(textToEmbed.length / 4)
        totalTokens += estimatedTokens

        processed++
        console.log(`  ✅ [${doc.title}] Embedding guardado (${embedding.length} dimensiones)`)
        
      } catch (error: any) {
        console.error(`  ❌ [${doc.title}] Error:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Proceso completado:`)
    console.log(`   - Procesados: ${processed}`)
    console.log(`   - Saltados: ${skipped}`)
    console.log(`   - Errores: ${errors}`)
    console.log(`   - Tokens estimados: ${totalTokens.toLocaleString()}`)
    console.log(`   - Costo estimado: $${(totalTokens / 1000000 * 0.02).toFixed(4)}`)

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors,
      tokensUsed: totalTokens,
      estimatedCost: totalTokens / 1000000 * 0.02
    })

  } catch (error: any) {
    console.error('❌ Error generando embeddings:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
