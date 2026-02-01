import fs from 'fs'
import { execFileSync } from 'child_process'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

// Lee DATABASE_URL de producción si no está en process.env.
// Preferimos usar scripts/get-db-url.mjs (lee .env.vercel.production/.env.production*)
// y solo si no existe, caemos a .env.local.
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return

  try {
    const value = execFileSync('node', ['scripts/get-db-url.mjs'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    })
    if (value && String(value).trim()) {
      process.env.DATABASE_URL = String(value).trim()
      return
    }
  } catch {
    // ignore and try .env.local
  }

  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) {
    console.error('No se pudo resolver DATABASE_URL (ni con scripts/get-db-url.mjs ni con .env.local).')
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

  // Quitar comillas envolventes si las hubiera
  if (
    (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
    (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
  ) {
    value = value.slice(1, -1).trim()
  }

  process.env.DATABASE_URL = value
}

ensureDatabaseUrl()

// Construye una URL compatible con PgBouncer/Supabase (sin statement cache)
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
  const email = process.env.ADMIN_EMAIL || 'alguero2@yahoo.com'

  const newPassword = process.env.NEW_ADMIN_PASSWORD
  if (!newPassword) {
    console.error('Falta la variable de entorno NEW_ADMIN_PASSWORD.')
    console.error('Ejemplo: NEW_ADMIN_PASSWORD="Opositapp2025!" node scripts/reset-admin-password.mjs')
    process.exit(1)
  }

  if (newPassword.length < 8) {
    console.error('La nueva contraseña debe tener al menos 8 caracteres.')
    process.exit(1)
  }

  console.log(`Buscando usuario admin con email ${email}...`)

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, active: true },
  })

  if (!user) {
    console.error('Usuario no encontrado en la base de datos.')
    process.exit(1)
  }

  if (String(user.role || '').toLowerCase() !== 'admin') {
    console.error(`El usuario encontrado no es admin (role=${user.role}). Abortando.`)
    process.exit(1)
  }

  if (!user.active) {
    console.error('El usuario admin está marcado como inactivo. Abortando.')
    process.exit(1)
  }

  console.log('Actualizando contraseña del admin en la base de datos de producción...')

  const hashed = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  })

  await prisma.session.deleteMany({ where: { userId: user.id } })

  console.log('Contraseña actualizada correctamente. Se han invalidado las sesiones activas.')
}

main()
  .catch((e) => {
    console.error('Error al resetear la contraseña del admin:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
