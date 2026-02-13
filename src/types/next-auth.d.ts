import type { DefaultSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      repoRole?: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: string
    repoRole?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    repoRole?: string | null
  }
}
