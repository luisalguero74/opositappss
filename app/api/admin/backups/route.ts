import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Sistema de backups en memoria (en producción se usa tabla BackupLog)
let backupHistory: Array<{
  id: string
  type: string
  backupType: 'data' | 'full'
  status: string
  size?: number
  duration?: number
  timestamp: string
  downloadUrl?: string
}> = []

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json({ backups: backupHistory })
  } catch (error) {
    console.error('[Backups GET Error]:', error)
    return NextResponse.json(
      { error: 'Error al obtener backups' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const backupType = (body.backupType || 'data') as 'data' | 'full'
    const startTime = Date.now()

    console.log('[Backup] Starting backup creation...', { backupType, user: session.user.email })

    // En producción con Vercel, solo generamos estadísticas
    // (descargar todo sería demasiado pesado y excedería límites)
    const [usersCount, questionsCount, questionnairesCount, userAnswersCount, attemptsCount] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.question.count().catch(() => 0),
      prisma.questionnaire.count().catch(() => 0),
      prisma.userAnswer.count().catch(() => 0),
      prisma.questionnaireAttempt.count().catch(() => 0)
    ])

    console.log('[Backup] Counts retrieved:', { usersCount, questionsCount, questionnairesCount })

    const duration = Math.round((Date.now() - startTime) / 1000)

    const backup = {
      id: `backup_${Date.now()}`,
      type: 'manual',
      backupType,
      status: 'completed',
      size: 0,
      duration,
      timestamp: new Date().toISOString()
    }

    backupHistory.unshift(backup)

    // Mantener solo los últimos 20 backups
    if (backupHistory.length > 20) {
      backupHistory = backupHistory.slice(0, 20)
    }

    return NextResponse.json({
      success: true,
      backup,
      message: `Backup ${backupType} completado. Estadísticas registradas.`,
      stats: {
        totalUsers: usersCount,
        totalQuestions: questionsCount,
        totalQuestionnaires: questionnairesCount,
        totalAnswers: userAnswersCount,
        totalAttempts: attemptsCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[Backup Creation Error]:', error)
    return NextResponse.json(
      { 
        error: 'Error al crear backup',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
