import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function withPgBouncerIfNeeded(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl) return databaseUrl

  // Heurística: Supabase Transaction Pooler (PgBouncer) suele usar puerto 6543 o host pooler.
  const looksLikePooler =
    databaseUrl.includes('pooler.supabase.com') ||
    databaseUrl.includes(':6543') ||
    databaseUrl.includes('6543')

  if (!looksLikePooler) return databaseUrl

  try {
    const url = new URL(databaseUrl)
    if (!url.searchParams.has('pgbouncer')) url.searchParams.set('pgbouncer', 'true')
    // Evita prepared statements con PgBouncer/transaction pooling.
    if (!url.searchParams.has('statement_cache_size')) url.searchParams.set('statement_cache_size', '0')
    return url.toString()
  } catch {
    return databaseUrl
  }
}

const prismaDbUrl = withPgBouncerIfNeeded(process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    prismaDbUrl
      ? {
          datasources: {
            db: {
              url: prismaDbUrl,
            },
          },
        }
      : undefined
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma