import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from './prisma'
import type { JWT } from 'next-auth/jwt'
import type { User } from 'next-auth'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      // @ts-expect-error NextAuth User type mismatch
      async authorize(credentials: Record<"email" | "password", string> | undefined): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password!)

        if (!isPasswordValid) return null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return user as any
      }
    })
  ],
  callbacks: {
    jwt: ({ token, user }: { token: JWT; user?: User }) => {
      if (user) {
        token.role = user.role
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: ({ session, token }: { session: any; token: JWT }) => {
      session.user.id = token.sub!
      session.user.role = token.role as string
      return session
    }
  },
  pages: {
    signIn: '/login'
  }
}

// @ts-expect-error NextAuth types issue
export default NextAuth(authOptions)