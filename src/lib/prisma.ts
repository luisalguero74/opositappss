import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const datasourceUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL

function withPrismaServerlessPgWorkaround(url: string): string {
  // In serverless + PgBouncer setups (common on Supabase), prepared statements can collide across requests.
  // Disabling Prisma's statement cache avoids the `prepared statement "sX" already exists` error.
  try {
    const parsed = new URL(url)

    if (!parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true')
    }
    if (!parsed.searchParams.has('statement_cache_size')) {
      parsed.searchParams.set('statement_cache_size', '0')
    }

    return parsed.toString()
  } catch {
    return url
  }
}

// Usamos siempre la URL adaptada a entornos con PgBouncer (Supabase),
// tanto en producción como en desarrollo, para evitar errores de
// "prepared statement \"sX\" already exists".
const effectiveDatasourceUrl =
  datasourceUrl ? withPrismaServerlessPgWorkaround(datasourceUrl) : datasourceUrl

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    effectiveDatasourceUrl
      ? {
          datasources: {
            db: {
              url: effectiveDatasourceUrl,
            },
          },
        }
      : undefined,
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma