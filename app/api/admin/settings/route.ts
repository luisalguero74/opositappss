import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener configuración de monetización
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.appSettings.findFirst()
    
    // Si no existe configuración, crearla con valores por defecto
    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          monetizationEnabled: false,
          freeAccessDays: 7,
          basicPrice: 9.99,
          premiumPrice: 19.99,
          currency: 'EUR'
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings] Error fetching settings:', error)
    return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 })
  }
}

// Actualizar configuración de monetización
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    
    let settings = await prisma.appSettings.findFirst()
    
    if (!settings) {
      settings = await prisma.appSettings.create({ data })
    } else {
      settings = await prisma.appSettings.update({
        where: { id: settings.id },
        data
      })
    }

    console.log(`[Settings] Configuración actualizada: monetización ${settings.monetizationEnabled ? 'activada' : 'desactivada'}`)

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings] Error updating settings:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
