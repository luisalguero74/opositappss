import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  // Solo mostrar cuestionarios publicados en la zona de usuarios
  const questionnaires = await prisma.questionnaire.findMany({
    where: { 
      ...(type ? { type } : {}),
      published: true
    },
    include: { questions: true }
  })
  
  return NextResponse.json(questionnaires)
}