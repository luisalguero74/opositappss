import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'

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

// Función auxiliar para crear backup completo (código + datos)
async function createFullBackup(backupData: any): Promise<{ buffer: Buffer; size: number }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => {
      const buffer = Buffer.concat(chunks)
      resolve({ buffer, size: buffer.length })
    })
    archive.on('error', reject)

    // Añadir datos de la BD como JSON
    const dataJson = JSON.stringify(backupData, null, 2)
    archive.append(dataJson, { name: 'database_backup.json' })

    // Añadir archivos del proyecto (excluyendo node_modules, .next, etc.)
    const projectRoot = process.cwd()
    
    // Archivos y carpetas importantes
    const includePatterns = [
      'app/**/*',
      'src/**/*',
      'prisma/**/*',
      'public/**/*',
      'scripts/**/*',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'next.config.mjs',
      '.env.example',
      'README.md'
    ]

    try {
      // Añadir directorios principales
      const mainDirs = ['app', 'src', 'prisma', 'public', 'scripts']
      for (const dir of mainDirs) {
        const dirPath = path.join(projectRoot, dir)
        try {
          // Archiver no tiene opción ignore incorporada, pero podemos filtrar manualmente
          archive.directory(dirPath, dir)
        } catch (e) {
          console.warn(`[Backup] Could not add directory ${dir}:`, e)
        }
      }

      // Añadir archivos de configuración
      const configFiles = [
        'package.json',
        'package-lock.json', 
        'tsconfig.json',
        'next.config.mjs',
        '.env.example'
      ]
      
      for (const file of configFiles) {
        const filePath = path.join(projectRoot, file)
        try {
          archive.file(filePath, { name: file })
        } catch (e) {
          console.warn(`[Backup] Could not add file ${file}:`, e)
        }
      }
    } catch (e) {
      console.warn('[Backup] Error adding project files:', e)
    }

    archive.finalize()
  })
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

    // Exportar todas las tablas principales con mejor manejo de errores
    let users: unknown[] = []
    let questions: unknown[] = []
    let questionnaires: unknown[] = []
    let userAnswers: unknown[] = []
    let attempts: unknown[] = []

    try {
      users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phoneNumber: true,
          active: true,
          createdAt: true
        },
        take: 10000
      })
    } catch (e) {
      console.warn('[Backup] Error fetching users:', e)
    }

    try {
      questions = await prisma.question.findMany({
        select: {
          id: true,
          questionnaireId: true,
          text: true,
          options: true,
          correctAnswer: true,
          explanation: true,
          temaCodigo: true,
          temaNumero: true,
          temaParte: true,
          temaTitulo: true,
          difficulty: true,
          createdAt: true
        },
        take: 50000
      })
    } catch (e) {
      console.warn('[Backup] Error fetching questions:', e)
    }

    try {
      questionnaires = await prisma.questionnaire.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          theme: true,
          published: true,
          createdAt: true
        },
        take: 10000
      })
    } catch (e) {
      console.warn('[Backup] Error fetching questionnaires:', e)
    }

    try {
      userAnswers = await prisma.userAnswer.findMany({
        select: {
          id: true,
          userId: true,
          questionId: true,
          questionnaireId: true,
          answer: true,
          isCorrect: true,
          createdAt: true
        },
        take: 100000
      })
    } catch (e) {
      console.warn('[Backup] Error fetching userAnswers:', e)
      // Fallback sin el campo answer
      try {
        userAnswers = await prisma.userAnswer.findMany({
          take: 100000
        }) as unknown[]
      } catch (e2) {
        console.warn('[Backup] Fallback also failed for userAnswers:', e2)
      }
    }

    try {
      attempts = await prisma.questionnaireAttempt.findMany({
        select: {
          id: true,
          userId: true,
          questionnaireId: true,
          score: true,
          correctAnswers: true,
          totalQuestions: true,
          timeSpent: true,
          completedAt: true
        },
        take: 50000
      })
    } catch (e) {
      console.warn('[Backup] Error fetching attempts:', e)
    }

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      metadata: {
        totalUsers: users.length,
        totalQuestions: questions.length,
        totalQuestionnaires: questionnaires.length,
        totalAnswers: userAnswers.length,
        totalAttempts: attempts.length
      },
      data: {
        users,
        questions,
        questionnaires,
        userAnswers,
        attempts
      }
    }

    let buffer: Buffer
    let size: number
    let mimeType: string
    let fileExtension: string

    if (backupType === 'full') {
      // Backup completo: código + datos en ZIP
      console.log('[Backup] Creating full backup (code + data)...')
      const result = await createFullBackup(backupData)
      buffer = result.buffer
      size = result.size
      mimeType = 'application/zip'
      fileExtension = 'zip'
    } else {
      // Backup solo datos: JSON
      console.log('[Backup] Creating data-only backup...')
      const jsonString = JSON.stringify(backupData, null, 2)
      buffer = Buffer.from(jsonString, 'utf-8')
      size = buffer.length
      mimeType = 'application/json'
      fileExtension = 'json'
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Crear data URL para descarga
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64}`

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

    const filename = `opositapp_backup_${backupType}_${new Date().toISOString().split('T')[0]}.${fileExtension}`

    return NextResponse.json({
      success: true,
      backup,
      filename,
      downloadUrl: dataUrl,
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
