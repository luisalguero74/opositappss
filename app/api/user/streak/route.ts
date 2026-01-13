import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Actualizar racha de estudio
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let streak = await prisma.studyStreak.findUnique({
      where: { userId: user.id }
    })

    if (!streak) {
      // Crear nueva racha
      streak = await prisma.studyStreak.create({
        data: {
          userId: user.id,
          currentStreak: 1,
          longestStreak: 1,
          totalStudyDays: 1,
          lastStudyDate: today
        }
      })
    } else {
      const lastStudy = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null
      
      if (lastStudy) {
        lastStudy.setHours(0, 0, 0, 0)
        const daysDiff = Math.floor((today.getTime() - lastStudy.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff === 0) {
          // Ya estudió hoy, no hacer nada
          return NextResponse.json({ streak })
        } else if (daysDiff === 1) {
          // Día consecutivo
          const newStreak = streak.currentStreak + 1
          streak = await prisma.studyStreak.update({
            where: { userId: user.id },
            data: {
              currentStreak: newStreak,
              longestStreak: Math.max(newStreak, streak.longestStreak),
              totalStudyDays: streak.totalStudyDays + 1,
              lastStudyDate: today
            }
          })
        } else {
          // Se rompió la racha
          streak = await prisma.studyStreak.update({
            where: { userId: user.id },
            data: {
              currentStreak: 1,
              totalStudyDays: streak.totalStudyDays + 1,
              lastStudyDate: today
            }
          })
        }
      } else {
        // Primera vez estudiando
        streak = await prisma.studyStreak.update({
          where: { userId: user.id },
          data: {
            currentStreak: 1,
            totalStudyDays: 1,
            lastStudyDate: today
          }
        })
      }
    }

    return NextResponse.json({ streak })

  } catch (error) {
    console.error('[Streak] Error:', error)
    return NextResponse.json({ 
      error: 'Error al actualizar racha'
    }, { status: 500 })
  }
}

// Obtener racha actual
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    let streak = await prisma.studyStreak.findUnique({
      where: { userId: user.id }
    })

    if (!streak) {
      streak = await prisma.studyStreak.create({
        data: { userId: user.id }
      })
    }

    return NextResponse.json({ streak })

  } catch (error) {
    console.error('[Streak] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener racha'
    }, { status: 500 })
  }
}
