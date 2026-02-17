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

    // Backup solo de datos (JSON) - optimizado para Vercel Pro
    // Limitar cantidad de registros para evitar timeout
    const [users, questions, questionnaires, userAnswers, attempts] = await Promise.all([
      prisma.user.findMany({ 
        select: { id: true, email: true, name: true, role: true, phoneNumber: true, active: true, createdAt: true },
        take: 10000 
      }),
      prisma.question.findMany({ 
        select: { id: true, questionnaireId: true, text: true, options: true, correctAnswer: true, explanation: true, temaCodigo: true, temaNumero: true, temaParte: true, difficulty: true },
        take: 30000 
      }),
      prisma.questionnaire.findMany({ 
        select: { id: true, title: true, type: true, theme: true, published: true, createdAt: true },
        take: 10000 
      }),
      prisma.userAnswer.findMany({ 
        select: { id: true, userId: true, questionId: true, questionnaireId: true, isCorrect: true, createdAt: true },
        take: 100000 
      }).catch(() => []),
      prisma.questionnaireAttempt.findMany({ 
        select: { id: true, userId: true, questionnaireId: true, score: true, correctAnswers: true, totalQuestions: true, timeSpent: true, completedAt: true },
        take: 50000 
      })
    ])

    console.log('[Backup] Data retrieved:', { 
      users: users.length, 
      questions: questions.length, 
      questionnaires: questionnaires.length,
      userAnswers: userAnswers.length,
      attempts: attempts.length 
    })

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      metadata: {
        totalUsers: users.length,
        totalQuestions: questions.length,
        totalQuestionnaires: questionnaires.length,
        totalAnswers: userAnswers.length,
        totalAttempts: attempts.length,
        backupType
      },
      data: {
        users,
        questions,
        questionnaires,
        userAnswers,
        attempts
      }
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const buffer = Buffer.from(jsonString, 'utf-8')
    const size = buffer.length
    
    // Comprimir para base64 más eficiente
    const base64 = buffer.toString('base64')
    const dataUrl = `data:application/json;base64,${base64}`

    const duration = Math.round((Date.now() - startTime) / 1000)

    console.log('[Backup] Backup created:', { size: `${(size/1024/1024).toFixed(2)}MB`, duration: `${duration}s` })

    const backup = {
      id: `backup_${Date.now()}`,
      type: 'manual',
      backupType,
      status: 'completed',
      size,
      duration,
      timestamp: new Date().toISOString(),
      downloadUrl: dataUrl
    }

    backupHistory.unshift(backup)

    // Mantener solo los últimos 20 backups
    if (backupHistory.length > 20) {
      backupHistory = backupHistory.slice(0, 20)
    }

    const filename = `opositapp_backup_${backupType}_${new Date().toISOString().split('T')[0]}.json`

    return NextResponse.json({
      success: true,
      backup,
      filename,
      downloadUrl: dataUrl,
      message: `Backup ${backupType} completado exitosamente.`,
      stats: backupData.metadata
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
