import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from './prisma'
import type { User } from 'next-auth'
import { RepoRole } from '@prisma/client'

// Defensive: Vercel env vars sometimes end up with trailing newlines when copy/pasted.
if (process.env.NEXTAUTH_URL) process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.trim()
if (process.env.NEXTAUTH_SECRET) process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET.trim()

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

export const authOptions: NextAuthOptions = {
  // Ensure we always use the trimmed secret even if process.env had extra whitespace.
  secret: NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) return null

        if (!user.password) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

        if (!isPasswordValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          repoRole: user.repoRole ?? RepoRole.NONE,
        }
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // Always keep role/repoRole in the token so UI & middleware can enforce access.
      if (user) {
        token.role = user.role
        token.repoRole = user.repoRole
      }

      // Refresh from DB so admin changes take effect without re-login,
      // and enforce the "allowed phones only" rule even for existing sessions.
      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, repoRole: true, phoneNumber: true },
        })

        if (dbUser) {
          token.role = dbUser.role
          token.repoRole = dbUser.repoRole

          const rawPhone = String(dbUser.phoneNumber || '').trim()
          if (!rawPhone) {
            token.phoneAllowed = false
          } else {
            const normalizedPhone = rawPhone.replace(/[\s-]/g, '')
            const phoneToCheck = normalizedPhone.startsWith('+34')
              ? normalizedPhone
              : normalizedPhone.startsWith('34')
                ? '+' + normalizedPhone
                : '+34' + normalizedPhone

            const phoneWithoutCountry = phoneToCheck.replace(/^\+34/, '')

            const allowedPhone = await prisma.allowedPhoneNumber.findFirst({
              where: {
                OR: [
                  { phoneNumber: phoneToCheck },
                  { phoneNumber: normalizedPhone },
                  { phoneNumber: phoneWithoutCountry },
                ],
              },
              select: { id: true },
            })

            token.phoneAllowed = Boolean(allowedPhone)
          }
        } else {
          token.phoneAllowed = false
        }
      }

      return token
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.role = String(token.role || 'user')
        session.user.repoRole = token.repoRole ?? RepoRole.NONE
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

export default NextAuth(authOptions)