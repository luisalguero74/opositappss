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

    const dbUrl = process.env.DATABASE_URL
    let dbTarget: { host: string; port: string; database: string; username: string } | null = null
    if (dbUrl) {
      try {
        const u = new URL(dbUrl)
        dbTarget = {
          host: u.hostname,
          port: u.port,
          database: u.pathname?.replace(/^\//, '') || '',
          username: u.username,
        }
      } catch {
        dbTarget = null
      }
    }

    const dbRuntime = await prisma.$queryRaw`
      SELECT
        current_database()::text AS database,
        current_user::text AS "user",
        inet_server_addr()::text AS server_addr,
        inet_server_port() AS server_port;
    `

    // Ejecutar query SQL raw para ver el schema de la tabla
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'LegalDocument'
      ORDER BY ordinal_position;
    `

    return NextResponse.json({ 
      env: {
        nodeEnv: process.env.NODE_ENV || null,
        vercelEnv: process.env.VERCEL_ENV || null,
        vercelUrl: process.env.VERCEL_URL || null,
      },
      dbTarget,
      dbRuntime,
      schema: result,
      info: 'Diagnóstico: entorno + BD conectada + columnas LegalDocument'
    })
  } catch (error: any) {
    console.error('[Schema] Error:', error)
    return NextResponse.json({ 
      error: 'Error obteniendo schema',
      details: error.message 
    }, { status: 500 })
  }
}
