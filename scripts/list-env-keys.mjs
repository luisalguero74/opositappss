#!/usr/bin/env node

import { readFileSync } from 'node:fs'

// Intentionally prints ONLY keys (never values) so it's safe to run.
// Include Vercel-pulled env files too.
const files = [
  '.env.vercel.production',
  '.env.vercel',
  '.env.production.vercel',
  '.env.production.local',
  '.env.production',
]

function parseKeys(text) {
  const keys = new Set()
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const key = t.slice(0, idx).trim()
    if (key) keys.add(key)
  }
  return keys
}

for (const file of files) {
  try {
    const keys = Array.from(parseKeys(readFileSync(file, 'utf8'))).sort()
    console.log(`-- ${file} (${keys.length} keys)`)
    for (const k of keys) console.log(k)
  } catch {
    console.log(`-- ${file} (missing/unreadable)`)
  }
}
