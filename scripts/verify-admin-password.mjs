import fs from 'fs'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return
  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) {
    console.error('.env.local no existe; no se puede leer DATABASE_URL.')
    process.exit(1)
  }
  const content = fs.readFileSync(envPath, 'utf8')
  const line = content
    .split('\n')
    .find((l) => l.trim().startsWith('DATABASE_URL='))
  if (!line) {
    console.error('No se ha encontrado DATABASE_URL en .env.local.')
    process.exit(1)
  }
  let value = line.slice('DATABASE_URL='.length).trim()
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim()
  }
  process.env.DATABASE_URL = value
}

ensureDatabaseUrl()

function buildPgbouncerSafeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl)
    if (!u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true')
    }
    if (!u.searchParams.has('statement_cache_size')) {
      u.searchParams.set('statement_cache_size', '0')
    }
    return u.toString()
  } catch {
    return rawUrl
  }
}

const baseUrl = process.env.DATABASE_URL
const effectiveUrl = baseUrl ? buildPgbouncerSafeUrl(baseUrl) : undefined

const prisma = new PrismaClient(
  effectiveUrl
    ? {
        datasources: {
          db: {
            url: effectiveUrl,
          },
        },
      }
    : undefined,
)

async function main() {
  const email = 'alguero2@yahoo.com'
  const candidate = 'Opositapp2025!'

  console.log('Leyendo usuario admin desde BD...')
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, active: true, password: true },
  })

  if (!user) {
    console.log('Usuario no encontrado')
    return
  }

  console.log('Usuario:', { email: user.email, role: user.role, active: user.active })

  if (!user.password) {
    console.log('El usuario no tiene password almacenada (null)')
    return
  }

  const ok = await bcrypt.compare(candidate, user.password)
  console.log('¿La contraseña "Opositapp2025!" coincide con la de BD?:', ok)
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
