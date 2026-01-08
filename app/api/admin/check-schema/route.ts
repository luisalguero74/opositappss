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

    // Ejecutar query SQL raw para ver el schema de la tabla
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'LegalDocument'
      ORDER BY ordinal_position;
    `

    return NextResponse.json({ 
      schema: result,
      info: 'Columnas de la tabla LegalDocument en producción'
    })
  } catch (error: any) {
    console.error('[Schema] Error:', error)
    return NextResponse.json({ 
      error: 'Error obteniendo schema',
      details: error.message 
    }, { status: 500 })
  }
}
