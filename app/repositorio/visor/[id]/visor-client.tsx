'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { formatWatermarkTimestampUtc, normalizeSpanishPhoneForDisplay } from '@/lib/phone-normalization'

export default function RepositorioVisorClient(props: { id: string }) {
  const router = useRouter()
  const { data: session, status } = useSession() as {
    data: Session | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
  }

  const documentId = String(props.id || '')

  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [watermarkTimestamp] = useState<string>(() => formatWatermarkTimestampUtc(new Date()))

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=/repositorio/visor/${encodeURIComponent(documentId)}`)
    }
  }, [status, router, documentId])

  const role = String(session?.user?.role || '').toLowerCase()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!session?.user) return
    if (role === 'admin') return

    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/user/account', { cache: 'no-store', credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok) {
          setPhoneNumber(String((data as any)?.phoneNumber || ''))
        }
      } catch {
        // Best-effort; watermark still shows email.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [status, session, role])

  const watermarkText = useMemo(() => {
    const base = 'OPOSITAPP · solo para uso formativo · NO DISTRIBUIR'
    if (role === 'admin') return ''
    const email = String(session?.user?.email || '—')
    const normalizedPhone = normalizeSpanishPhoneForDisplay(phoneNumber)
    const phone = String(normalizedPhone || '—')
    const ts = String(watermarkTimestamp || formatWatermarkTimestampUtc(new Date()))
    return `${base} · ${email} · ${phone} · ${ts}`
  }, [session?.user?.email, phoneNumber, role, watermarkTimestamp])

  const repoRole = String((session?.user as any)?.repoRole || 'NONE').toUpperCase()
  const canAccessRepository = Boolean(session?.user) && (role === 'admin' || repoRole !== 'NONE')

  if (!documentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Documento inválido.</p>
      </div>
    )
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando visor...</p>
      </div>
    )
  }

  if (!canAccessRepository) {
    router.replace('/dashboard')
    return null
  }

  const src = `/api/repository/download/${encodeURIComponent(documentId)}?preview=1`

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/repositorio" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              Volver al repositorio
            </Link>
            <p className="text-[11px] text-slate-500 truncate">Visor (solo lectura) • {watermarkText}</p>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap"
            title="Abrir el documento en una nueva pestaña"
          >
            Abrir en pestaña
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div
          className="relative bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ height: 'calc(100vh - 140px)' }}
        >
          <iframe src={src} className="absolute inset-0 h-full w-full" title="Visor de documento" />

          {watermarkText ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-0 flex flex-wrap items-center justify-center gap-16 opacity-20"
              style={{ transform: 'rotate(-25deg)' }}
            >
              {Array.from({ length: 28 }).map((_, idx) => (
                <div key={idx} className="text-slate-500 text-xs sm:text-sm font-semibold whitespace-nowrap">
                  {watermarkText}
                </div>
              ))}
            </div>
          </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
