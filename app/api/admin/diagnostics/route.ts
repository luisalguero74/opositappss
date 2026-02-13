import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || String(session.user.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      checks: {} as Record<string, any>,
      summary: {
        allGreen: false,
        issues: [] as string[]
      }
    }

    // 1. Verificar variables de entorno
    diagnostics.checks.env = {
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      GROQ_KEY_LENGTH: process.env.GROQ_API_KEY?.length || 0
    }

    // 2. Verificar conexión a base de datos
    try {
      const startDb = Date.now()
      await prisma.$queryRaw`SELECT 1 as test`
      const dbTime = Date.now() - startDb
      
      diagnostics.checks.database = {
        connected: true,
        responseTime: dbTime + 'ms'
      }
      
      // Contar preguntas
      const questionCount = await prisma.question.count()
      diagnostics.checks.database.questionCount = questionCount
      
    } catch (dbError) {
      diagnostics.checks.database = {
        connected: false,
        error: dbError instanceof Error ? dbError.message : String(dbError)
      }
    }

    // 3. Verificar API de Groq (usando fetch directo)
    if (process.env.GROQ_API_KEY) {
      try {
        const startGroq = Date.now()
        
        // Timeout de 10 segundos
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Test' }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            max_tokens: 10
          }),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!apiResponse.ok) {
          throw new Error(`Groq API error: ${apiResponse.status} ${apiResponse.statusText}`)
        }
        
        const completion = await apiResponse.json()
        const groqTime = Date.now() - startGroq
        
        diagnostics.checks.groq = {
          connected: true,
          responseTime: groqTime + 'ms',
          model: 'llama-3.3-70b-versatile',
          response: completion.choices[0]?.message?.content || 'OK'
        }
        
      } catch (groqError: any) {
        const errorDetails = {
          connected: false,
          error: groqError instanceof Error ? groqError.message : String(groqError),
          errorType: groqError?.constructor?.name || 'Unknown',
          errorCode: groqError?.code || 'N/A',
          errorStatus: groqError?.status || 'N/A'
        }
        
        // Intentar obtener más detalles
        if (groqError?.response) {
          errorDetails.error += ` | Response: ${JSON.stringify(groqError.response)}`
        }
        
        diagnostics.checks.groq = errorDetails
      }
    } else {
      diagnostics.checks.groq = {
        connected: false,
        error: 'GROQ_API_KEY no configurada'
      }
    }

    // 4. Verificar memoria y recursos
    diagnostics.checks.system = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    }

    // Resumen
    diagnostics.summary = {
      allGreen: diagnostics.checks.database.connected && diagnostics.checks.groq.connected,
      issues: []
    }

    if (!diagnostics.checks.database.connected) {
      diagnostics.summary.issues.push('Base de datos no conectada')
    }
    if (!diagnostics.checks.groq.connected) {
      diagnostics.summary.issues.push('API de Groq no conectada')
    }

    return NextResponse.json(diagnostics)

  } catch (error) {
    console.error('[Diagnostics] Error:', error)
    return NextResponse.json({ 
      error: 'Error en diagnóstico',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
