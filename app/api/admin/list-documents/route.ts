import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const role = session?.user?.role?.toUpperCase()
    
    if (!session || role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const documents = await prisma.legalDocument.findMany({
      select: {
        id: true,
        title: true,
        fileName: true,
        documentType: true
      },
      orderBy: {
        fileName: 'asc'
      }
    })

    return NextResponse.json({ 
      success: true,
      documents,
      total: documents.length
    })

  } catch (error: any) {
    console.error('Error listando documentos:', error)
    return NextResponse.json({ 
      error: 'Error al listar documentos',
      details: error.message 
    }, { status: 500 })
  }
}
