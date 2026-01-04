import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const revalidate = 0

export async function GET() {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1` // Comprobación rápida de DB
    const durationMs = Date.now() - start
    return NextResponse.json({ status: 'ok', db: 'ok', durationMs })
  } catch (error) {
    return NextResponse.json({ status: 'error', db: 'fail', message: 'DB check failed' }, { status: 500 })
  }
}
