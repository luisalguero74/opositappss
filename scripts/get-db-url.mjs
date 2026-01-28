#!/usr/bin/env node

import { readFileSync } from 'node:fs'

// Prefer an explicit Vercel pull if present; fall back to local production env files.
const files = ['.env.vercel.production', '.env.production.local', '.env.production']
const keys = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL']

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    let value = t.slice(idx + 1).trim()
    // Algunos proveedores (p.ej. Vercel/Supabase) pueden dejar secuencias "\n"
    // al final de la DATABASE_URL. Las eliminamos para evitar errores tipo
    // "database \"postgres\\n\" does not exist" al hacer pg_dump.
    value = value.replace(/\\n+$/, '')
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function adjustForPgBouncer(raw) {
  // Limpieza extra por seguridad: eliminar secuencias "\n" residuales
  // al final y recortar espacios.
  let value = raw.replace(/\\n+$/, '').trim()
  try {
    const u = new URL(value)
    const isPooler = u.hostname.includes('pooler.supabase.com') || u.port === '6543'
    if (isPooler) {
      // Desactivamos prepared statements en Prisma para PgBouncer
      // para evitar errores tipo "prepared statement \"s0\" already exists".
      u.searchParams.set('pgbouncer', 'true')
      value = u.toString()
    }
  } catch {
    // Si no se puede parsear como URL, usamos el valor tal cual
  }
  return value
}

for (const file of files) {
  try {
    const env = parseEnv(readFileSync(file, 'utf8'))
    for (const key of keys) {
      const raw = env[key]
      if (typeof raw === 'string' && raw.trim()) {
        const value = adjustForPgBouncer(raw)
        process.stdout.write(value)
        process.exit(0)
      }
    }
  } catch {
    // ignore missing/unreadable files
  }
}

console.error('No DB url found in .env.vercel.production/.env.production.local/.env.production')
process.exit(1)
