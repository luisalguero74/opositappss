import type { DefaultSession } from 'next-auth'
import type { RepoRole } from '@prisma/client'
import type { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      repoRole: RepoRole
    } & DefaultSession['user']
  }

  interface User {
    role: string
    repoRole: RepoRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: string
    repoRole?: RepoRole
    phoneAllowed?: boolean
  }
}
