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
        if (!credentials?.email || !credentials?.password) {
          securityLogger.logLoginFailed(credentials?.email || 'unknown', getClientIp(req?.headers))
          return null
        }

        const ip = getClientIp(req?.headers)
        const email = credentials.email.toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          securityLogger.logLoginFailed(email, ip, 'user_not_found')
          return null
        }

        // Verificar si la cuenta está activa
        if (user.active === false) {
          securityLogger.logLoginFailed(email, ip, 'account_inactive')
          throw new Error('Tu cuenta ha sido desactivada. Contacta con el administrador.')
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password!)

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
      }
    })
  ],
  callbacks: {
    jwt: ({ token, user }: { token: JWT & { role?: string }; user?: User }) => {
      console.log('[JWT Callback] user:', user, 'token before:', token)
      if (user && 'role' in user) {
        token.role = (user as unknown as { role?: string }).role
        console.log('[JWT Callback] token role set to:', token.role)
      }
      console.log('[JWT Callback] token after:', token)
      return token
    },
    session: ({ session, token }: { session: Session; token: JWT & { role?: string } }) => {
      console.log('[Session Callback] token:', token, 'session before:', session)
      // Solo añadimos id y rol cuando existe un usuario en sesión (evita errores en estado no autenticado)
      if (session.user) {
        session.user.id = token.sub ?? session.user.id
        session.user.role = token.role ?? session.user.role ?? 'user'
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