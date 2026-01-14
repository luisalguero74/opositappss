import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function ensureAppSettingsTableExists() {
  // Idempotent, constant SQL only (no user input).
  // This is a safety net for environments where Prisma migrations were not applied.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AppSettings" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "monetizationEnabled" BOOLEAN NOT NULL DEFAULT false,
      "freeAccessDays" INTEGER NOT NULL DEFAULT 7,
      "basicPrice" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
      "premiumPrice" DOUBLE PRECISION NOT NULL DEFAULT 19.99,
      "currency" TEXT NOT NULL DEFAULT 'EUR',

      "adsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "adsenseClientId" TEXT,
      "affiliatesEnabled" BOOLEAN NOT NULL DEFAULT false,
      "amazonAffiliateId" TEXT,
      "sponsorsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "donationsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "patreonUrl" TEXT,
      "kofiUrl" TEXT,
      "premiumContentEnabled" BOOLEAN NOT NULL DEFAULT false,

      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  // Ensure missing columns exist (idempotent, IF NOT EXISTS)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AppSettings"
      ADD COLUMN IF NOT EXISTS "freeAccessDays" INTEGER NOT NULL DEFAULT 7,
      ADD COLUMN IF NOT EXISTS "basicPrice" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
      ADD COLUMN IF NOT EXISTS "premiumPrice" DOUBLE PRECISION NOT NULL DEFAULT 19.99,
      ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS "adsEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "adsenseClientId" TEXT,
      ADD COLUMN IF NOT EXISTS "affiliatesEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "amazonAffiliateId" TEXT,
      ADD COLUMN IF NOT EXISTS "sponsorsEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "donationsEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "patreonUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "kofiUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "premiumContentEnabled" BOOLEAN NOT NULL DEFAULT false;
  `)

  // Best-effort: triggers/functions are optional and may require extra privileges.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS update_appsettings_updated_at ON "AppSettings";
      CREATE TRIGGER update_appsettings_updated_at
      BEFORE UPDATE ON "AppSettings"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `)
  } catch (error) {
    console.warn('[Settings] Optional updatedAt trigger setup failed; continuing:', error)
  }
}

const DEFAULT_SETTINGS = {
  monetizationEnabled: false,
  freeAccessDays: 7,
  basicPrice: 9.99,
  premiumPrice: 19.99,
  currency: 'EUR',

  // Monetización sin suscripción
  adsEnabled: false,
  adsenseClientId: null as string | null,
  affiliatesEnabled: false,
  amazonAffiliateId: null as string | null,
  sponsorsEnabled: false,
  donationsEnabled: false,
  patreonUrl: null as string | null,
  kofiUrl: null as string | null,
  premiumContentEnabled: false
}

type SettingsUpdate = Partial<{
  monetizationEnabled: boolean
  freeAccessDays: number
  basicPrice: number
  premiumPrice: number
  currency: string
  adsEnabled: boolean
  adsenseClientId: string | null
  affiliatesEnabled: boolean
  amazonAffiliateId: string | null
  sponsorsEnabled: boolean
  donationsEnabled: boolean
  patreonUrl: string | null
  kofiUrl: string | null
  premiumContentEnabled: boolean
}>

function toOptionalTrimmedString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function buildUpdateData(input: any): SettingsUpdate {
  const update: SettingsUpdate = {}

  if (input && typeof input === 'object') {
    if ('monetizationEnabled' in input) update.monetizationEnabled = toBoolean(input.monetizationEnabled, false)
    if ('freeAccessDays' in input) update.freeAccessDays = Math.max(0, Math.floor(toFiniteNumber(input.freeAccessDays, 7)))
    if ('basicPrice' in input) update.basicPrice = Math.max(0, toFiniteNumber(input.basicPrice, 9.99))
    if ('premiumPrice' in input) update.premiumPrice = Math.max(0, toFiniteNumber(input.premiumPrice, 19.99))
    if ('currency' in input && typeof input.currency === 'string') update.currency = input.currency.trim() || 'EUR'

    if ('adsEnabled' in input) update.adsEnabled = toBoolean(input.adsEnabled, false)
    if ('adsenseClientId' in input) update.adsenseClientId = toOptionalTrimmedString(input.adsenseClientId)
    if ('affiliatesEnabled' in input) update.affiliatesEnabled = toBoolean(input.affiliatesEnabled, false)
    if ('amazonAffiliateId' in input) update.amazonAffiliateId = toOptionalTrimmedString(input.amazonAffiliateId)
    if ('sponsorsEnabled' in input) update.sponsorsEnabled = toBoolean(input.sponsorsEnabled, false)
    if ('donationsEnabled' in input) update.donationsEnabled = toBoolean(input.donationsEnabled, false)
    if ('patreonUrl' in input) update.patreonUrl = toOptionalTrimmedString(input.patreonUrl)
    if ('kofiUrl' in input) update.kofiUrl = toOptionalTrimmedString(input.kofiUrl)
    if ('premiumContentEnabled' in input) update.premiumContentEnabled = toBoolean(input.premiumContentEnabled, false)
  }

  return update
}

// Obtener configuración de monetización
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = String(session?.user?.role || '').toLowerCase() === 'admin'

    // Public-safe read: pricing page (and others) can request settings even when not authenticated.
    // Only PATCH remains admin-only.

    let settings: any = null
    try {
      settings = await prisma.appSettings.findFirst()
    } catch (error) {
      console.error('[Settings] Error fetching settings:', error)
      try {
        await ensureAppSettingsTableExists()
        settings = await prisma.appSettings.findFirst()
      } catch (recoveryError) {
        console.error('[Settings] Recovery failed (ensureAppSettingsTableExists):', recoveryError)
        return NextResponse.json(DEFAULT_SETTINGS)
      }
    }
    
    // Si no existe configuración, crearla con valores por defecto
    if (!settings) {
      if (isAdmin) {
        try {
          settings = await prisma.appSettings.create({
            data: DEFAULT_SETTINGS
          })
        } catch (error) {
          console.error('[Settings] Error creating default settings:', error)
          return NextResponse.json(DEFAULT_SETTINGS)
        }
      } else {
        return NextResponse.json(DEFAULT_SETTINGS)
      }
    }

    return NextResponse.json(settings ?? DEFAULT_SETTINGS)
  } catch (error) {
    console.error('[Settings] Error fetching settings:', error)
    return NextResponse.json(DEFAULT_SETTINGS)
  }
}

// Actualizar configuración de monetización
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Role check: prefer session.role, but fallback to DB (in case role is not propagated for some reason).
    let isAdmin = String((session.user as any)?.role || '').toLowerCase() === 'admin'
    if (!isAdmin && session.user?.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: session.user.email, mode: 'insensitive' } },
        select: { role: true }
      })
      isAdmin = String(dbUser?.role || '').toLowerCase() === 'admin'
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const raw = await req.json().catch(() => null)
    const data = buildUpdateData(raw)

    // Best-effort: ensure table exists (ignore errors)
    try {
      await ensureAppSettingsTableExists()
    } catch (e) {
      console.warn('[Settings] ensureAppSettingsTableExists failed (non-fatal):', e)
    }
    
    let settings: any = null
    try {
      settings = await prisma.appSettings.findFirst()
    } catch (error) {
      console.error('[Settings] Error fetching settings for update:', error)
      // Fallback: intentar crear configuración por defecto junto con los datos recibidos,
      // evitando operaciones de DDL que podrían requerir permisos elevados.
      try {
        settings = await prisma.appSettings.create({ data: { ...DEFAULT_SETTINGS, ...data } as any })
      } catch (creationError: any) {
        console.error('[Settings] Creation attempt failed:', creationError)
        const details = creationError?.message || String(creationError)
        return NextResponse.json({ error: 'Error updating settings', details }, { status: 500 })
      }
    }
    
    try {
      if (!settings) {
        settings = await prisma.appSettings.create({ data: { ...DEFAULT_SETTINGS, ...data } as any })
      } else {
        settings = await prisma.appSettings.update({
          where: { id: settings.id },
          data: data as any
        })
      }
    } catch (error) {
      console.error('[Settings] Error updating settings:', error)
      const details = error instanceof Error ? error.message : String(error)
      return NextResponse.json(
        { error: 'Error updating settings', details },
        { status: 500 }
      )
    }

    console.log(`[Settings] Configuración actualizada: monetización ${settings.monetizationEnabled ? 'activada' : 'desactivada'}`)

    return NextResponse.json(settings)
  } catch (error) {
    console.error('[Settings] Error updating settings (outer):', error)
    const details = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Error updating settings', details },
      { status: 500 }
    )
  }
}
