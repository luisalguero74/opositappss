'use client'

import { SessionProvider } from 'next-auth/react'
import LicenseBadge from './LicenseBadge'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LicenseBadge />
      {children}
    </SessionProvider>
  )
}