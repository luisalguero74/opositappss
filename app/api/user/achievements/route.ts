import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Obtener logros
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        achievements: {
          include: {
            achievement: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener todos los logros disponibles
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { createdAt: 'asc' }
    })

    const unlocked = user.achievements.map((ua: any) => ({
      ...ua.achievement,
      unlockedAt: ua.unlockedAt
    }))

    const locked = allAchievements.filter(
      (a: any) => !unlocked.find((u: any) => u.id === a.id)
    )

    return NextResponse.json({ 
      unlocked, 
      locked,
      totalPoints: unlocked.reduce((sum: number, a: any) => sum + a.points, 0)
    })

  } catch (error) {
    console.error('[Achievements] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener logros'
    }, { status: 500 })
  }
}

// Desbloquear logro manualmente (para testing)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { achievementId } = await req.json()

    const unlocked = await prisma.userAchievement.create({
      data: {
        userId: user.id,
        achievementId
      },
      include: {
        achievement: true
      }
    })

    return NextResponse.json({ unlocked })

  } catch (error) {
    console.error('[Unlock Achievement] Error:', error)
    return NextResponse.json({ 
      error: 'Error al desbloquear logro'
    }, { status: 500 })
  }
}
