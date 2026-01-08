import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Contar todos los documentos
    const totalDocs = await prisma.legalDocument.count()
    const activeDocs = await prisma.legalDocument.count({ where: { active: true } })
    const inactiveDocs = await prisma.legalDocument.count({ where: { active: false } })
    
    // Para embeddings y content, obtener todos y contar manualmente
    const allDocs = await prisma.legalDocument.findMany({
      select: {
        embedding: true,
        content: true
      }
    })
    
    const withEmbeddings = allDocs.filter(d => d.embedding !== null && d.embedding !== '').length
    const withContent = allDocs.filter(d => d.content !== null && d.content.length > 100).length

    // Obtener algunos documentos de ejemplo
    const samples = await prisma.legalDocument.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileName: true,
        active: true,
        content: true,
        embedding: true,
        createdAt: true,
        _count: {
          select: {
            sections: true,
            questions: true,
            temas: true
          }
        }
      }
    })

    const samplesInfo = samples.map(s => ({
      id: s.id,
      title: s.title,
      fileName: s.fileName,
      active: s.active,
      hasContent: !!s.content && s.content.length > 100,
      contentLength: s.content?.length || 0,
      hasEmbedding: !!s.embedding,
      sections: s._count.sections,
      questions: s._count.questions,
      temas: s._count.temas,
      createdAt: s.createdAt
    }))

    return NextResponse.json({
      totales: {
        total: totalDocs,
        activos: activeDocs,
        inactivos: inactiveDocs,
        conEmbeddings: withEmbeddings,
        conContenido: withContent
      },
      ejemplos: samplesInfo
    })
  } catch (error: any) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ 
      error: 'Error en diagnóstico',
      details: error.message 
    }, { status: 500 })
  }
}
