import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processDocument } from '@/lib/document-processor'
import { join } from 'path'
import { existsSync } from 'fs'

// Reprocesa todos los documentos legales ya subidos y actualiza contenido + secciones
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const documents = await prisma.legalDocument.findMany()
    const baseDir = join(process.cwd(), 'documentos-temario')

    let processed = 0
    let skipped = 0
    const errors: Array<{ id: string; reason: string }> = []

    for (const doc of documents) {
      if (!doc.fileName) {
        skipped++
        errors.push({ id: doc.id, reason: 'Sin fileName asociado' })
        continue
      }

      // Determinar carpeta según documentType
      let subDir = 'biblioteca'
      if (doc.documentType === 'temario_general') subDir = 'general'
      else if (doc.documentType === 'temario_especifico') subDir = 'especifico'

      const filePath = join(baseDir, subDir, doc.fileName)
      if (!existsSync(filePath)) {
        skipped++
        errors.push({ id: doc.id, reason: `Archivo no encontrado: ${subDir}/${doc.fileName}` })
        continue
      }

      try {
        const processedDoc = await processDocument(filePath, doc.fileName)

        await prisma.documentSection.deleteMany({ where: { documentId: doc.id } })

        await prisma.legalDocument.update({
          where: { id: doc.id },
          data: {
            content: processedDoc.content,
            processedAt: new Date(),
            sections: {
              create: processedDoc.sections.map((s, idx) => ({
                title: s.title,
                content: s.content,
                order: idx
              }))
            }
          }
        })

        processed++
      } catch (error: any) {
        skipped++
        errors.push({ id: doc.id, reason: error?.message || 'Error procesando documento' })
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      total: documents.length,
      errors
    })
  } catch (error) {
    console.error('[Documents Reindex] Error:', error)
    return NextResponse.json({ error: 'Error al reprocesar documentos' }, { status: 500 })
  }
}
