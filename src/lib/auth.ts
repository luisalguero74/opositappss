import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from './prisma'
import { securityLogger, getClientIp } from './security-logger'
import type { JWT } from 'next-auth/jwt'
import type { User, Session, NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: Record<'email' | 'password', string> | undefined, req: any): Promise<User | null> {
        try {
          if (!credentials?.email || !credentials?.password) {
            securityLogger.logLoginFailed(credentials?.email || 'unknown', getClientIp(req?.headers))
            return null
          }

          const ip = getClientIp(req?.headers)
          const email = credentials.email.trim().toLowerCase()

          const user = await prisma.user.findFirst({
            where: {
              email: {
                equals: email,
                mode: 'insensitive'
              }
            }
          })

          if (!user) {
            securityLogger.logLoginFailed(email, ip, 'user_not_found')
            return null
          }

          // Verificar si la cuenta está activa
          if (user.active === false) {
            securityLogger.logLoginFailed(email, ip, 'account_inactive')
            return null
          }

          if (!user.password) {
            securityLogger.logLoginFailed(email, ip, 'password_not_set')
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            securityLogger.logLoginFailed(email, ip, 'invalid_password')
            return null
          }

          securityLogger.logLoginSuccess(user.id, email, ip)

          const result = {
            id: user.id,
            name: user.email,
            email: user.email,
            role: user.role
          } as User

          console.log('[AUTH] User returned from authorize:', result)
          return result
        } catch (error) {
          console.error('[AUTH] authorize error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }: { token: JWT & { role?: string }; user?: User }) => {
      console.log('[JWT Callback] user:', user, 'token before:', token)
      try {
        if (user && 'role' in user) {
          token.role = String((user as unknown as { role?: string }).role || '').toLowerCase()
          console.log('[JWT Callback] token role set to (from user):', token.role)
        } else if (!token.role && token.sub) {
          // Backfill role for old sessions/tokens that predate role propagation
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true }
          })
          if (dbUser?.role) {
            token.role = String(dbUser.role).toLowerCase()
            console.log('[JWT Callback] token role backfilled (from DB):', token.role)
          }
        }
      } catch (error) {
        console.error('[JWT Callback] role hydration error:', error)
      }
      console.log('[JWT Callback] token after:', token)
      return token
    },
    session: async ({ session, token }: { session: Session; token: JWT & { role?: string } }) => {
      console.log('[Session Callback] token:', token, 'session before:', session)
      try {
        // Solo añadimos id y rol cuando existe un usuario en sesión (evita errores en estado no autenticado)
        if (session.user) {
          session.user.id = token.sub ?? session.user.id

          let role: string | undefined = token.role ?? session.user.role
          if (!role && session.user.id) {
            const dbUser = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { role: true }
            })
            role = dbUser?.role ? String(dbUser.role) : undefined
          }

          session.user.role = String(role ?? 'user').toLowerCase()
        }
      } catch (error) {
        console.error('[Session Callback] role hydration error:', error)
        if (session.user) {
          session.user.role = String(session.user.role ?? token.role ?? 'user').toLowerCase()
        }
      }
      console.log('[Session Callback] session after:', session)
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

export default NextAuth(authOptions)