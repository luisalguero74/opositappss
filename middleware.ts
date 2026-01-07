import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rate limiting configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Rate limits por endpoint
const RATE_LIMITS = {
  '/api/auth/': { requests: 10, window: 60000 }, // 10 requests por minuto para auth
  '/api/admin/': { requests: 100, window: 60000 }, // 100 requests por minuto para admin
  '/api/': { requests: 50, window: 60000 }, // 50 requests por minuto para otras APIs
}

// Security headers (base)
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Default-deny; some routes (classrooms) override to allow Jitsi.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Content Security Policy
// IMPORTANT: Do not duplicate directives (e.g. multiple `script-src`). Browsers only honor the first occurrence.
const CSP_BASE = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://api.groq.com https://api.stripe.com wss:;
  media-src 'self' data: blob:;
  frame-src 'self' https://js.stripe.com;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

const CSP_JITSI = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://js.stripe.com https://cdn.jsdelivr.net https://meet.jit.si https://*.jit.si https://*.jitsi.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://api.groq.com https://api.stripe.com https://meet.jit.si https://*.jit.si https://*.jitsi.net https://meet-jit-si-turnrelay.jitsi.net wss:;
  media-src 'self' data: blob:;
  worker-src 'self' blob:;
  frame-src 'self' https://js.stripe.com https://meet.jit.si https://*.jit.si https://*.jitsi.net;
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim()

// Rutas protegidas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/quiz',
  '/practical-cases',
  '/statistics',
  '/asistente-estudio',
  '/forum',
  '/classroom',
  '/spaced-repetition',
  '/marked-questions',
  '/failed-questions',
]

// Rutas de administrador
const adminRoutes = ['/admin']

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
  '/login',
  '/register',
  '/pricing',
  '/',
  '/api/auth',
  '/_next',
  '/favicon.ico',
]

// Rate limiting function
function rateLimit(ip: string, pathname: string): boolean {
  const now = Date.now()
  
  // Encontrar el límite aplicable
  let limit = RATE_LIMITS['/api/']
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path)) {
      limit = config
      break
    }
  }

  const key = `${ip}:${pathname}`
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    // Nueva ventana de tiempo
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + limit.window,
    })
    return true
  }

  if (record.count >= limit.requests) {
    return false
  }

  record.count++
  return true
}

// Limpiar rate limit map periódicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Limpiar cada minuto

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Aplicar security headers a todas las respuestas
  const response = NextResponse.next()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const isClassroomRoute = pathname.startsWith('/classroom')
  response.headers.set('Content-Security-Policy', isClassroomRoute ? CSP_JITSI : CSP_BASE)

  if (isClassroomRoute) {
    // Allow camera/mic for embedded Jitsi in classroom pages
    response.headers.set(
      'Permissions-Policy',
      'camera=(self "https://meet.jit.si" "https://*.jit.si" "https://*.jitsi.net"), microphone=(self "https://meet.jit.si" "https://*.jit.si" "https://*.jitsi.net"), geolocation=()'
    )
  }

  // Rate limiting para rutas API
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    if (!rateLimit(ip, pathname)) {
      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Por favor, espera un momento antes de intentar de nuevo',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // Permitir rutas públicas sin autenticación
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Verificar autenticación para rutas protegidas
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      // Redirigir a login si no está autenticado
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Verificar si es ruta de admin y si el usuario es admin
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (String(token.role || '').toLowerCase() !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return response
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav)$).*)',
  ],
}
