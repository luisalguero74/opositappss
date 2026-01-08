import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

export async function GET() {
  const start = Date.now()
  const checks: any = {
    timestamp: new Date().toISOString(),
    db: 'unknown',
    groq: 'unknown',
    env: {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasDbUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV
    }
  }

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    const [documents, sections] = await Promise.all([
      prisma.legalDocument.count(),
      prisma.documentSection.count()
    ])
    checks.db = 'ok'
    checks.durationMs = Date.now() - start
    checks.documentCount = documents
    checks.sectionCount = sections

    // Check Groq API connection
    if (process.env.GROQ_API_KEY) {
      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        checks.groq = groqResponse.ok ? 'ok' : 'fail'
      } catch (error: any) {
        checks.groq = 'fail'
        checks.groqError = error.message
      }
    } else {
      checks.groq = 'no-key'
    }

    return NextResponse.json({ 
      status: checks.db === 'ok' ? 'ok' : 'error',
      checks 
    })
  } catch (error: any) {
    console.error('[HEALTH] Check failed:', error)
    checks.db = 'fail'
    checks.error = error.message
    return NextResponse.json({ 
      status: 'error',
      checks
    }, { status: 500 })
  }
}
