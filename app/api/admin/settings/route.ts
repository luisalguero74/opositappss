import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_SETTINGS = {
  monetizationEnabled: false,
  freeAccessDays: 7,
  basicPrice: 9.99,
  premiumPrice: 19.99,
  currency: 'EUR'
}

// Obtener configuración de monetización
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = String(session?.user?.role || '').toLowerCase() === 'admin'

    // Public-safe read: pricing page (and others) can request settings even when not authenticated.
    // Only PATCH remains admin-only.

    let settings: any = null
    try {
      settings = await prisma.appSettings.findFirst()
    } catch (error) {
      console.error('[Settings] Error fetching settings:', error)
      return NextResponse.json(DEFAULT_SETTINGS)
    }
    
    // Si no existe configuración, crearla con valores por defecto
    if (!settings) {
      if (isAdmin) {
        try {
          settings = await prisma.appSettings.create({
            data: DEFAULT_SETTINGS
          })
        } catch (error) {
          console.error('[Settings] Error creating default settings:', error)
          return NextResponse.json(DEFAULT_SETTINGS)
        }
      } else {
        return NextResponse.json(DEFAULT_SETTINGS)
      }
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings] Error fetching settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

// Actualizar configuración de monetización
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await req.json()
    
    let settings: any = null
    try {
      settings = await prisma.appSettings.findFirst()
    } catch (error) {
      console.error('[Settings] Error fetching settings for update:', error)
      // DB drift: fail-open (monetization should not block the app).
      return NextResponse.json(DEFAULT_SETTINGS)
    }
    
    try {
      if (!settings) {
        settings = await prisma.appSettings.create({ data })
      } else {
        settings = await prisma.appSettings.update({
          where: { id: settings.id },
          data
        })
      }
    } catch (error) {
      console.error('[Settings] Error updating settings:', error)
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    console.log(`[Settings] Configuración actualizada: monetización ${settings.monetizationEnabled ? 'activada' : 'desactivada'}`)

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings] Error updating settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}
