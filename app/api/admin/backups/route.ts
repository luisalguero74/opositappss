import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import archiver from 'archiver'
import path from 'path'

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
    return NextResponse.json({ error: 'Error al obtener backups' }, { status: 500 })
  }
}

async function createFullBackup(backupData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    archive.append(JSON.stringify(backupData, null, 2), { name: 'database_backup.json' })

    const projectRoot = process.cwd()
    const mainDirs = ['app', 'src', 'prisma', 'public']
    
    for (const dir of mainDirs) {
      try {
        archive.directory(path.join(projectRoot, dir), dir)
      } catch (e) {
        console.warn(`[Backup] Could not add directory ${dir}:`, e)
      }
    }

    const configFiles = ['package.json', 'tsconfig.json', 'next.config.ts', '.env.example']
    for (const file of configFiles) {
      try {
        archive.file(path.join(projectRoot, file), { name: file })
      } catch (e) {
        console.warn(`[Backup] Could not add file ${file}:`, e)
      }
    }

    archive.finalize()
  })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const backupType = (body.backupType || 'data') as 'data' | 'full'

    console.log('[Backup] Starting:', { backupType, user: session.user.email })

    // Obtener datos con manejo de errores robusto
    const [users, questions, questionnaires, userAnswers, attempts] = await Promise.all([
      prisma.user.findMany({ 
        select: { id: true, email: true, name: true, role: true, phoneNumber: true, active: true, createdAt: true },
        take: 10000 
      }).catch(() => []),
      prisma.question.findMany({ 
        select: { id: true, questionnaireId: true, text: true, options: true, correctAnswer: true, explanation: true, temaCodigo: true, temaNumero: true, temaParte: true, difficulty: true },
        take: 30000 
      }).catch(() => []),
      prisma.questionnaire.findMany({ 
        select: { id: true, title: true, type: true, theme: true, published: true, createdAt: true },
        take: 10000 
      }).catch(() => []),
      prisma.userAnswer.findMany({ 
        select: { id: true, userId: true, questionId: true, questionnaireId: true, isCorrect: true, createdAt: true },
        take: 100000 
      }).catch(() => []),
      prisma.questionnaireAttempt.findMany({ 
        select: { id: true, userId: true, questionnaireId: true, score: true, correctAnswers: true, totalQuestions: true, timeSpent: true, completedAt: true },
        take: 50000 
      }).catch(() => [])
    ])

    const fetchTime = Math.round((Date.now() - startTime) / 1000)
    console.log('[Backup] Data fetched in', fetchTime, 's:', { 
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
        backupType,
        createdBy: session.user.email
      },
      data: { users, questions, questionnaires, userAnswers, attempts }
    }

    let finalBuffer: Buffer
    let mimeType: string
    let fileExtension: string

    if (backupType === 'full') {
      console.log('[Backup] Creating FULL backup...')
      try {
        finalBuffer = await Promise.race([
          createFullBackup(backupData),
          new Promise<Buffer>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 50s')), 50000)
          )
        ])
        mimeType = 'application/zip'
        fileExtension = 'zip'
      } catch (err) {
        throw new Error('Backup completo excedió tiempo límite. Usa Backup de Datos.')
      }
    } else {
      console.log('[Backup] Creating DATA backup...')
      finalBuffer = Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8')
      mimeType = 'application/json'
      fileExtension = 'json'
    }
    
    const finalSize = finalBuffer.length
    
    if (finalSize > 45 * 1024 * 1024) {
      throw new Error('Backup demasiado grande (>45MB)')
    }
    
    const base64 = finalBuffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`
    const duration = Math.round((Date.now() - startTime) / 1000)

    console.log('[Backup] Success:', { 
      type: backupType, 
      size: `${(finalSize/1024/1024).toFixed(2)}MB`, 
      duration: `${duration}s` 
    })

    const backup = {
      id: `backup_${Date.now()}`,
      type: 'manual',
      backupType,
      status: 'completed',
      size: finalSize,
      duration,
      timestamp: new Date().toISOString(),
      downloadUrl: dataUrl
    }

    backupHistory.unshift(backup)
    if (backupHistory.length > 20) {
      backupHistory = backupHistory.slice(0, 20)
    }

    const filename = `opositapp_backup_${backupType}_${new Date().toISOString().split('T')[0]}.${fileExtension}`

    return NextResponse.json({
      success: true,
      backup,
      filename,
      downloadUrl: dataUrl,
      message: `Backup ${backupType === 'full' ? 'completo (datos + código)' : 'de datos'} completado exitosamente.`,
      stats: backupData.metadata
    })
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.error('[Backup Error]:', error instanceof Error ? error.message : error)
    
    return NextResponse.json(
      { 
        error: 'Error al crear backup',
        details: error instanceof Error ? error.message : 'Error desconocido',
        duration: `${duration}s`
      },
      { status: 500 }
    )
  }
}
