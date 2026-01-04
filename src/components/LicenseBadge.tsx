'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function LicenseBadge() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // No mostrar en login y register
  if (pathname === '/login' || pathname === '/register') {
    return null
  }

  // No mostrar para administradores
  if (session?.user?.role === 'admin') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-xl border border-emerald-200 px-5 py-4 flex items-center gap-4 hover:shadow-xl transition-all duration-300">
        <div className="relative w-12 h-12 flex-shrink-0">
          <Image
            src="/logos/ecap.png"
            alt="ECAP Logo"
            width={48}
            height={48}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-emerald-700 leading-tight">
            Versión en abierto
          </span>
          <span className="text-sm text-emerald-600 leading-tight">
            Matriculados ECAP
          </span>
          <span className="text-xs text-emerald-500 leading-tight mt-0.5">
            Convocatoria 2025
          </span>
        </div>
      </div>
    </div>
  )
}
