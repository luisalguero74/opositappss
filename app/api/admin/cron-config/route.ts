import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CronConfig {
  path: string
  schedule: string
  enabled: boolean
}

interface VercelConfig {
  buildCommand?: string
  devCommand?: string
  installCommand?: string
  crons?: CronConfig[]
}

const VERCEL_JSON_PATH = path.join(process.cwd(), 'vercel.json')

async function readVercelConfig(): Promise<VercelConfig> {
  try {
    const content = await fs.readFile(VERCEL_JSON_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Error leyendo vercel.json:', error)
    throw new Error('No se pudo leer la configuración de Vercel')
  }
}

async function writeVercelConfig(config: VercelConfig): Promise<void> {
  try {
    const content = JSON.stringify(config, null, 2)
    await fs.writeFile(VERCEL_JSON_PATH, content + '\n', 'utf-8')
  } catch (error) {
    console.error('Error escribiendo vercel.json:', error)
    throw new Error('No se pudo guardar la configuración de Vercel')
  }
}

// GET - Obtener configuración actual de crons
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      )
    }

    const config = await readVercelConfig()
    
    const availableCrons = [
      {
        id: 'general',
        name: 'Generación Temario General',
        path: '/api/cron/run/general',
        defaultSchedule: '0 2 * * *',
        description: 'Genera preguntas para temario general diariamente a las 2:00 AM'
      },
      {
        id: 'especifico',
        name: 'Generación Temario Específico',
        path: '/api/cron/run/especifico',
        defaultSchedule: '0 4 * * 1',
        description: 'Genera preguntas para temario específico los lunes a las 4:00 AM'
      },
      {
        id: 'all',
        name: 'Generación Completa',
        path: '/api/cron/run/all',
        defaultSchedule: '0 3 1 * *',
        description: 'Genera preguntas para todos los temas el día 1 de cada mes a las 3:00 AM'
      }
    ]

    const currentCrons = config.crons || []
    
    const cronsWithStatus = availableCrons.map(cron => {
      const active = currentCrons.find(c => c.path === cron.path)
      return {
        ...cron,
        enabled: !!active,
        schedule: active?.schedule || cron.defaultSchedule
      }
    })

    return NextResponse.json({
      crons: cronsWithStatus,
      hasActiveCrons: currentCrons.length > 0
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error al obtener configuración de crons', details: message },
      { status: 500 }
    )
  }
}

// POST - Actualizar configuración de crons
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { cronId, enabled, schedule } = body

    if (!cronId) {
      return NextResponse.json(
        { error: 'Se requiere cronId' },
        { status: 400 }
      )
    }

    const config = await readVercelConfig()
    let currentCrons = config.crons || []

    const cronPaths: Record<string, string> = {
      general: '/api/cron/run/general',
      especifico: '/api/cron/run/especifico',
      all: '/api/cron/run/all'
    }

    const cronPath = cronPaths[cronId]
    if (!cronPath) {
      return NextResponse.json(
        { error: 'cronId inválido' },
        { status: 400 }
      )
    }

    // Remover cron existente si existe
    currentCrons = currentCrons.filter(c => c.path !== cronPath)

    // Agregar si está habilitado
    if (enabled) {
      currentCrons.push({
        path: cronPath,
        schedule: schedule || '0 2 * * *',
        enabled: true
      })
    }

    config.crons = currentCrons
    await writeVercelConfig(config)

    return NextResponse.json({
      success: true,
      message: enabled 
        ? `Cron ${cronId} activado con schedule: ${schedule}` 
        : `Cron ${cronId} desactivado`,
      crons: currentCrons
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración de crons', details: message },
      { status: 500 }
    )
  }
}

// PUT - Actualizar todos los crons a la vez
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere rol de administrador.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { crons } = body

    if (!Array.isArray(crons)) {
      return NextResponse.json(
        { error: 'Se requiere un array de crons' },
        { status: 400 }
      )
    }

    const config = await readVercelConfig()
    
    const newCrons: CronConfig[] = crons
      .filter(c => c.enabled)
      .map(c => ({
        path: c.path,
        schedule: c.schedule,
        enabled: true
      }))

    config.crons = newCrons
    await writeVercelConfig(config)

    return NextResponse.json({
      success: true,
      message: `Configuración actualizada: ${newCrons.length} cron(s) activo(s)`,
      crons: newCrons
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración de crons', details: message },
      { status: 500 }
    )
  }
}
