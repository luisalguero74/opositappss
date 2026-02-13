import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkUserAccess } from '@/lib/subscription'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('[Check Access] Session:', JSON.stringify(session))
    
    if (!session?.user?.id) {
      console.log('[Check Access] No session or user ID')
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No autenticado' 
      }, { status: 401 })
    }

    // Admins always have access (avoid subscription/monetization checks)
    if (String(session.user.role || '').toLowerCase() === 'admin') {
      return NextResponse.json({
        hasAccess: true,
        reason: 'Acceso de administrador'
      })
    }

    console.log('[Check Access] Checking access for user:', session.user.id, 'role:', session.user.role)
    const access = await checkUserAccess(session.user.id)
    console.log('[Check Access] Access result:', JSON.stringify(access))
    
    return NextResponse.json(access)
  } catch (error) {
    console.error('[Check Access] Error:', error)
    // While monetization is not in use, failing open avoids blocking the product.
    return NextResponse.json(
      {
        hasAccess: true,
        reason: 'Monetización desactivada'
      },
      { status: 200 }
    )
  }
}
