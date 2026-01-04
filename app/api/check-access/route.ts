import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkUserAccess } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No autenticado' 
      }, { status: 401 })
    }

    const access = await checkUserAccess(session.user.id)
    
    return NextResponse.json(access)
  } catch (error) {
    console.error('[Check Access] Error:', error)
    return NextResponse.json({ 
      hasAccess: false, 
      reason: 'Error al verificar acceso' 
    }, { status: 500 })
  }
}
