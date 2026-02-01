#!/usr/bin/env node

import { readFileSync } from 'node:fs'

// Selecciona una URL apta para migraciones (preferimos conexión directa / non-pooling).
// - Preferencia: DIRECT_URL, POSTGRES_URL_NON_POOLING
// - Fallback: DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL
// Además, elimina parámetros que rompen herramientas externas (p.ej. psql) y que no aportan a migraciones.

const files = ['.env.vercel.production', '.env.production.local', '.env.production', '.env.production.vercel']
const preferKeys = [
  'DIRECT_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL',
]

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    let value = t.slice(idx + 1).trim()

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

function sanitizeForTools(raw) {
  const value = String(raw || '').trim().replace(/\\n+$/, '')
  try {
    const u = new URL(value)
    // Parámetros que Prisma/pgBouncer pueden usar, pero que no queremos forzar aquí
    // y que además rompen psql si aparecen.
    u.searchParams.delete('pgbouncer')
    u.searchParams.delete('statement_cache_size')
    u.searchParams.delete('connection_limit')

    // Si queda sin params, quitamos el ?
    return u.toString()
  } catch {
    return value
  }
}

function tryDeriveDirectFromPooler(raw) {
  try {
    const u = new URL(raw)
    const port = u.port || '5432'
    const isPooler =
      u.hostname.includes('pooler.supabase.com') || port === '6543' || u.hostname.includes('pooler')
    if (!isPooler) return null

    // En Supabase pooler, el usuario suele ser "postgres.<project_ref>".
    // La conexión directa suele ser db.<project_ref>.supabase.co (5432) con usuario "postgres".
    const m = String(u.username || '').match(/^postgres\.(.+)$/)
    const projectRef = m?.[1]
    if (!projectRef) return null

    const direct = new URL(u.toString())
    direct.hostname = `db.${projectRef}.supabase.co`
    direct.port = '5432'
    direct.username = 'postgres'

    // Para conexiones directas a Supabase normalmente necesitamos SSL.
    if (!direct.searchParams.get('sslmode')) {
      direct.searchParams.set('sslmode', 'require')
    }

    direct.searchParams.delete('pgbouncer')
    direct.searchParams.delete('statement_cache_size')
    direct.searchParams.delete('connection_limit')

    return direct.toString()
  } catch {
    return null
  }
}

function diagnose(key, raw, selected) {
  try {
    const u = new URL(raw)
    const port = u.port || '5432'
    const isPooler = u.hostname.includes('pooler.supabase.com') || port === '6543' || u.hostname.includes('pooler')
    // No imprimimos user/pass
    process.stdout.write(
      `[db-url-for-migrations] ${selected ? 'SELECTED' : 'FOUND'} ${key}: ${u.hostname}:${port} ${isPooler ? '(POOLER)' : '(DIRECT/OTHER)'}\n`
    )
  } catch {
    process.stdout.write(`[db-url-for-migrations] ${selected ? 'SELECTED' : 'FOUND'} ${key}: (not a URL)\n`)
  }
}

const args = new Set(process.argv.slice(2))
const doDiagnose = args.has('--diagnose')

let merged = {}
for (const file of files) {
  try {
    const env = parseEnv(readFileSync(file, 'utf8'))
    merged = { ...merged, ...env }
  } catch {
    // ignore missing/unreadable
  }
}

if (doDiagnose) {
  for (const key of preferKeys) {
    if (Object.prototype.hasOwnProperty.call(merged, key)) {
      diagnose(key, merged[key], false)
    }
  }

  // En modo diagnóstico nunca imprimimos la URL completa.
  // Solo mostramos qué variables existen y cuál se seleccionaría.
}

for (const key of preferKeys) {
  if (!Object.prototype.hasOwnProperty.call(merged, key)) continue
  const raw = merged[key]
  if (typeof raw !== 'string' || !raw.trim()) continue

  if (doDiagnose) {
    diagnose(key, raw, true)
    process.exit(0)
  }

  // Si la mejor opción es el pooler y no tenemos DIRECT_URL/POSTGRES_URL_NON_POOLING,
  // intentamos derivar una URL directa a partir del project_ref.
  const derivedDirect = tryDeriveDirectFromPooler(raw)
  if (derivedDirect) {
    process.stdout.write(derivedDirect)
    process.exit(0)
  }

  const sanitized = sanitizeForTools(raw)
  process.stdout.write(sanitized)
  process.exit(0)
}

console.error('No DB url found in production env files')
process.exit(1)
