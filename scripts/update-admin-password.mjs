#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

const ENV_FILES = ['.env.vercel.production', '.env.production.local', '.env.production', '.env.bak']
const DB_KEYS = ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL']

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..')

function fingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 10)
}

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

function resolveDbUrl() {
  // Allow explicit override via process env (does not require any env file).
  for (const key of DB_KEYS) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) {
      return { url: value.trim(), source: `process.env.${key}` }
    }
  }

  for (const file of ENV_FILES) {
    try {
      const envPath = path.join(PROJECT_ROOT, file)
      const env = parseEnv(readFileSync(envPath, 'utf8'))
      for (const key of DB_KEYS) {
        const value = env[key]
        if (typeof value === 'string' && value.trim()) {
          return { url: value.trim(), source: `${file}:${key}` }
        }
      }
    } catch {
      // ignore missing/unreadable files
    }
  }
  return null
}

function parseArgs(argv) {
  const args = { email: null, yes: false, logout: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--yes') args.yes = true
    else if (a === '--logout') args.logout = true
    else if (a === '--email') args.email = argv[++i] ?? null
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)
  const email = args.email

  if (!email) {
    console.error('Usage: node scripts/update-admin-password.mjs --email you@example.com [--logout] --yes')
    console.error('DB URL is read from env files or can be provided via env var: DATABASE_URL / DIRECT_URL / POSTGRES_URL / POSTGRES_PRISMA_URL')
    process.exit(1)
  }

  const resolved = resolveDbUrl()
  if (!resolved) {
    console.error('No DB url found in .env.vercel.production/.env.production.local/.env.production')
    console.error('Tip: provide DATABASE_URL (or DIRECT_URL) explicitly for a one-off run, e.g.:')
    console.error("  DATABASE_URL='postgres://...' node scripts/update-admin-password.mjs --email you@example.com")
    process.exit(1)
  }

  const { url: dbUrl, source: dbSource } = resolved
  const dbFp = fingerprint(dbUrl)

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true }
    })

    if (!user) {
      console.error(`User not found for email: ${email}`)
      process.exit(1)
    }

    if (String(user.role || '').toLowerCase() !== 'admin') {
      console.error(`Refusing: user ${email} is not admin (role=${user.role})`)
      process.exit(1)
    }

    if (!args.yes) {
      console.log(`DB target OK (source=${dbSource}, fp=${dbFp}).`)
      console.log(`Dry run OK. Would update password for admin: ${user.email} (id=${user.id}).`)
      console.log('Re-run with --yes to apply. Optionally add --logout to invalidate sessions.')
      return
    }

    const newPassword = String(process.env.NEW_PASSWORD || '')
    if (!newPassword) {
      console.error('Missing NEW_PASSWORD env var. Run with a silent prompt, e.g.:')
      console.error("  read -s -p 'New admin password: ' NEW_PASSWORD; echo; NEW_PASSWORD=\"$NEW_PASSWORD\" node scripts/update-admin-password.mjs --email you@example.com --yes")
      process.exit(1)
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    })

    if (args.logout) {
      // NextAuth sessions table name is typically "Session".
      await prisma.session.deleteMany({ where: { userId: user.id } })
    }

    console.log(`OK. Updated admin password for ${user.email}${args.logout ? ' and logged out existing sessions' : ''}.`)
    console.log(`DB used (source=${dbSource}, fp=${dbFp}).`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error('Error:', e?.message || e)
  process.exit(1)
})
