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

for (const file of files) {
  try {
    const env = parseEnv(readFileSync(file, 'utf8'))
    for (const key of keys) {
      const value = env[key]
      if (typeof value === 'string' && value.trim()) {
        process.stdout.write(value.trim())
        process.exit(0)
      }
    }
  } catch {
    // ignore missing/unreadable files
  }
}

console.error('No DB url found in .env.production.local/.env.production')
process.exit(1)
