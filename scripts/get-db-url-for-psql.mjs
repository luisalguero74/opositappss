#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

function loadFromGetDbUrl() {
  const out = execFileSync(process.execPath, ['scripts/get-db-url.mjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'ignore'],
    env: process.env,
  })
    .toString('utf8')
    .trim()
    .replace(/\n+$/, '')

  return out || null
}

function main() {
  const raw = process.env.DATABASE_URL || loadFromGetDbUrl()
  if (!raw) {
    console.error('No DB url found')
    process.exit(1)
  }

  try {
    const u = new URL(raw)

    // psql no acepta el parámetro "pgbouncer".
    u.searchParams.delete('pgbouncer')
    u.searchParams.delete('statement_cache_size')
    u.searchParams.delete('connection_limit')

    // Para Supabase normalmente requiere SSL.
    if (!u.searchParams.get('sslmode')) {
      u.searchParams.set('sslmode', 'require')
    }

    process.stdout.write(u.toString())
  } catch {
    process.stdout.write(String(raw))
  }
}

main()
