#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

function readEnvFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    if (!key) continue
    if (process.env[key] != null) continue // do not override

    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    // Algunos proveedores pueden dejar secuencias "\\n" al final del valor
    value = value.replace(/\\n+$/, '').trim()

    process.env[key] = value
  }
}

function readEnvFileKeys({ filePath, keys, override }) {
  if (!fs.existsSync(filePath)) return { loaded: [], missing: true }
  const content = fs.readFileSync(filePath, 'utf8')
  const wanted = new Set(keys)
  const loaded = []

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    if (!wanted.has(key)) continue

    if (!override && process.env[key] != null) continue

    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    // Algunos proveedores pueden dejar secuencias "\\n" al final del valor
    value = value.replace(/\\n+$/, '').trim()

    process.env[key] = value
    loaded.push(key)
  }

  return { loaded, missing: false }
}

function ensureEnvLoaded() {
  // Similar to Next.js, but for standalone scripts
  readEnvFileIfExists('.env.local')
  readEnvFileIfExists('.env.production.local')
  readEnvFileIfExists('.env')
}

function ensureProdEnvLoaded() {
  // Prefer Vercel pull if present; then production env files.
  // In prod-mode we DO override critical vars to avoid using an old shell DATABASE_URL.
  const criticalKeys = [
    'DATABASE_URL',
    // temario (preferred)
    'B2_TEMARIO_S3_BUCKET',
    'B2_TEMARIO_BUCKET',
    'B2_TEMARIO_S3_ENDPOINT',
    'B2_TEMARIO_S3_REGION',
    'B2_TEMARIO_S3_ACCESS_KEY_ID',
    'B2_TEMARIO_S3_SECRET_ACCESS_KEY',
    'B2_S3_ENDPOINT',
    'B2_S3_REGION',
    'B2_S3_ACCESS_KEY_ID',
    'B2_S3_SECRET_ACCESS_KEY',
    'B2_S3_BUCKET',
    // legacy
    'B2_KEY_ID',
    'B2_APPLICATION_KEY',
    'B2_BUCKET_NAME',
    'B2_ENDPOINT',
  ]

  readEnvFileKeys({ filePath: '.env.vercel.production', keys: criticalKeys, override: true })
  readEnvFileKeys({ filePath: '.env.production.local', keys: criticalKeys, override: true })
  readEnvFileKeys({ filePath: '.env.production', keys: criticalKeys, override: true })
  // Optional fallback
  readEnvFileIfExists('.env')
}

function getEnv(name) {
  return process.env[name] ? String(process.env[name]) : ''
}

function requireEnv(name) {
  const value = getEnv(name)
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function adjustDatabaseUrlForPgBouncer() {
  const raw = getEnv('DATABASE_URL')
  if (!raw) return

  try {
    const u = new URL(raw)
    const isPooler = u.hostname.includes('pooler.supabase.com') || u.port === '6543'
    if (isPooler) {
      u.searchParams.set('pgbouncer', 'true')
      process.env.DATABASE_URL = u.toString()
    }
  } catch {
    // ignore non-URL values
  }
}

function getB2Config() {
  // If temario-specific credentials are provided, do NOT fall back to legacy secrets.
  const temarioAccessKeyId = getEnv('B2_TEMARIO_S3_ACCESS_KEY_ID')
  const temarioSecretAccessKey = getEnv('B2_TEMARIO_S3_SECRET_ACCESS_KEY')
  const temarioBucket = getEnv('B2_TEMARIO_S3_BUCKET') || getEnv('B2_TEMARIO_BUCKET')
  const temarioEndpoint = getEnv('B2_TEMARIO_S3_ENDPOINT') || getEnv('B2_S3_ENDPOINT')
  const temarioRegion = getEnv('B2_TEMARIO_S3_REGION') || getEnv('B2_S3_REGION') || 'us-east-1'

  if (temarioAccessKeyId) {
    if (!temarioSecretAccessKey || !temarioBucket || !temarioEndpoint) return null
    return {
      endpoint: temarioEndpoint,
      region: temarioRegion,
      accessKeyId: temarioAccessKeyId,
      secretAccessKey: temarioSecretAccessKey,
      bucket: temarioBucket,
      source: 'temario',
    }
  }

  // Global S3-compatible credentials (shared)
  const globalAccessKeyId = getEnv('B2_S3_ACCESS_KEY_ID')
  const globalSecretAccessKey = getEnv('B2_S3_SECRET_ACCESS_KEY')
  const globalBucket = getEnv('B2_S3_BUCKET')
  const globalEndpoint = getEnv('B2_S3_ENDPOINT')
  const globalRegion = getEnv('B2_S3_REGION') || 'us-east-1'

  if (globalAccessKeyId) {
    if (!globalSecretAccessKey || !globalBucket || !globalEndpoint) return null
    return {
      endpoint: globalEndpoint,
      region: globalRegion,
      accessKeyId: globalAccessKeyId,
      secretAccessKey: globalSecretAccessKey,
      bucket: globalBucket,
      source: 'global',
    }
  }

  // Legacy compatibility (some scripts in this repo)
  const legacyEndpoint = getEnv('B2_S3_ENDPOINT') || getEnv('B2_ENDPOINT')
  const legacyAccessKeyId = getEnv('B2_KEY_ID')
  const legacySecretAccessKey = getEnv('B2_APPLICATION_KEY')
  const legacyBucket =
    getEnv('B2_TEMARIO_S3_BUCKET') || getEnv('B2_TEMARIO_BUCKET') || getEnv('B2_BUCKET_NAME')

  if (legacyEndpoint && legacyAccessKeyId && legacySecretAccessKey && legacyBucket) {
    return {
      endpoint: legacyEndpoint,
      region: 'us-east-1',
      accessKeyId: legacyAccessKeyId,
      secretAccessKey: legacySecretAccessKey,
      bucket: legacyBucket,
      source: 'legacy',
    }
  }

  return null
}

function inferContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.txt') return 'text/plain; charset=utf-8'
  if (ext === '.doc') return 'application/msword'
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (ext === '.epub') return 'application/epub+zip'
  return 'application/octet-stream'
}

function normalizeEndpoint(endpoint) {
  const trimmed = String(endpoint || '').trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function parseArgs(argv) {
  const args = {
    source: null,
    categoria: null,
    dryRun: true,
    verbose: false,
    env: 'local',
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--source' || a === '-s') args.source = argv[++i] || null
    else if (a === '--categoria' || a === '--category' || a === '-c') args.categoria = argv[++i] || null
    else if (a === '--env') args.env = String(argv[++i] || 'local').toLowerCase()
    else if (a === '--apply') args.dryRun = false
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--verbose' || a === '-v') args.verbose = true
    else if (a === '--help' || a === '-h') args.help = true
  }

  return args
}

function printUsage() {
  console.log(`\nB2 temario sync (private)\n\nChecks which temario files exist in DB vs B2 bucket, and optionally uploads missing ones from a local folder.\n\nUsage:\n  node scripts/b2-temario-sync.mjs [--dry-run] [--apply] [--env local|prod] [--source <folder>] [--categoria <general|especifico>]\n\nExamples:\n  # Only report what's missing (default: local env files)\n  node scripts/b2-temario-sync.mjs --dry-run\n\n  # Report against production env files (.env.vercel.production/.env.production*)\n  node scripts/b2-temario-sync.mjs --dry-run --env prod\n\n  # Upload missing files from a folder that contains subfolders general/ and especifico/\n  node scripts/b2-temario-sync.mjs --apply --source /path/to/temario\n\n  # Only for one category\n  node scripts/b2-temario-sync.mjs --dry-run --categoria general\n\nRequired env vars (preferred):\n  DATABASE_URL\n  B2_TEMARIO_S3_BUCKET (or B2_TEMARIO_BUCKET)\n  B2_S3_ENDPOINT\n  B2_S3_REGION\n  B2_S3_ACCESS_KEY_ID\n  B2_S3_SECRET_ACCESS_KEY\n  (fallback bucket: B2_S3_BUCKET)\n\nNotes:\n  - Object keys are: <categoria>/<fileName> (e.g. general/tema1_constitucion.txt)\n  - Local folder names can be: general/ and especifico/ (or específico/ with accent)\n  - This script never makes the bucket public.\n`)
}

async function listKeysByPrefix(client, bucket, prefix) {
  const keys = []
  let continuationToken = undefined

  while (true) {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    )

    for (const obj of result.Contents || []) {
      if (obj.Key) keys.push(obj.Key)
    }

    if (!result.IsTruncated) break
    continuationToken = result.NextContinuationToken
  }

  return keys
}

async function findLocalFile(sourceDir, categoria, fileName) {
  const categoryFolderCandidates = [categoria]
  if (categoria === 'especifico') categoryFolderCandidates.push('específico')

  for (const folderName of categoryFolderCandidates) {
    const direct1 = path.join(sourceDir, folderName, fileName)
    if (fs.existsSync(direct1) && fs.statSync(direct1).isFile()) return direct1
  }

  const direct2 = path.join(sourceDir, fileName)
  if (fs.existsSync(direct2) && fs.statSync(direct2).isFile()) return direct2

  // Last resort: recursive search by exact basename
  const target = fileName

  async function walk(dir) {
    let entries
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch {
      return null
    }

    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        const found = await walk(full)
        if (found) return found
      } else if (e.isFile()) {
        if (e.name === target) return full
      }
    }

    return null
  }

  return await walk(sourceDir)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printUsage()
    process.exit(0)
  }

  if (args.env === 'prod' || args.env === 'production') {
    ensureProdEnvLoaded()
  } else {
    ensureEnvLoaded()
  }

  if ((args.env === 'prod' || args.env === 'production') && args.verbose) {
    // Safe diagnostics (bucket names/endpoints are not secrets)
    const temarioBucket = getEnv('B2_TEMARIO_S3_BUCKET') || getEnv('B2_TEMARIO_BUCKET')
    const fallbackBucket = getEnv('B2_S3_BUCKET') || getEnv('B2_BUCKET_NAME')
    const endpoint = getEnv('B2_TEMARIO_S3_ENDPOINT') || getEnv('B2_S3_ENDPOINT') || getEnv('B2_ENDPOINT')
    console.log(`(debug) B2_TEMARIO bucket env: ${temarioBucket || '(empty)'}`)
    console.log(`(debug) B2 fallback bucket env: ${fallbackBucket || '(empty)'}`)
    console.log(`(debug) B2 endpoint env: ${endpoint ? String(endpoint).replace(/^https?:\/\//, '') : '(empty)'}`)
  }

  // DB
  requireEnv('DATABASE_URL')
  adjustDatabaseUrlForPgBouncer()
  const prisma = new PrismaClient()

  // B2
  const b2 = getB2Config()
  if (!b2) {
    console.error('Missing B2 config. Set B2_S3_* env vars (preferred) or legacy B2_* vars.')
    process.exit(1)
  }

  if (args.verbose) {
    const masked = b2.accessKeyId ? `…${String(b2.accessKeyId).slice(-6)}` : '(empty)'
    console.log(`(debug) B2 config source: ${b2.source || 'unknown'}`)
    console.log(`(debug) B2 accessKeyId: ${masked}`)
    console.log(`(debug) B2 region: ${b2.region}`)
  }

  const client = new S3Client({
    region: b2.region,
    endpoint: normalizeEndpoint(b2.endpoint),
    // Backblaze B2 S3 is most reliable with path-style addressing.
    forcePathStyle: true,
    credentials: {
      accessKeyId: b2.accessKeyId,
      secretAccessKey: b2.secretAccessKey,
    },
  })

  const allowedCategorias = ['general', 'especifico']
  const categorias = args.categoria ? [args.categoria] : allowedCategorias

  for (const c of categorias) {
    if (!allowedCategorias.includes(c)) {
      console.error(`Invalid categoria: ${c}. Use: general | especifico`) // keep strict
      process.exit(1)
    }
  }

  try {
    const rows = await prisma.temaArchivo.findMany({
      include: {
        tema: { select: { categoria: true, numero: true, titulo: true } },
      },
      orderBy: { uploadedAt: 'asc' },
    })

    const required = rows
      .map((r) => ({
        categoria: String(r.tema?.categoria || '').toLowerCase(),
        fileName: r.nombre,
        key: `${String(r.tema?.categoria || '').toLowerCase()}/${r.nombre}`,
        temaNumero: r.tema?.numero,
        temaTitulo: r.tema?.titulo,
      }))
      .filter((r) => categorias.includes(r.categoria))

    if (!required.length) {
      console.log('No TemaArchivo rows found for the selected categoria(s).')
      console.log(`Env mode: ${args.env}`)
      return
    }

    // Fetch remote keys
    const remoteKeySet = new Set()
    for (const categoria of categorias) {
      const keys = await listKeysByPrefix(client, b2.bucket, `${categoria}/`)
      for (const k of keys) remoteKeySet.add(k)
    }

    const missing = required.filter((r) => !remoteKeySet.has(r.key))

    console.log(`\nEnv mode: ${args.env}`)
    console.log(`B2 bucket: ${b2.bucket}`)
    console.log(`Categorias: ${categorias.join(', ')}`)
    console.log(`DB files: ${required.length}`)
    console.log(`Missing in B2: ${missing.length}`)

    if (missing.length) {
      console.log('\nMissing objects:')
      for (const m of missing) {
        const label = m.temaNumero != null ? `T${String(m.temaNumero).padStart(2, '0')}` : 'T??'
        console.log(`- [${m.categoria}] ${label} ${m.fileName}`)
      }
    }

    if (!args.source) {
      if (missing.length) {
        console.log('\nNo --source provided, so nothing uploaded.')
        process.exitCode = 2
      }
      return
    }

    if (missing.length === 0) {
      console.log('\nNothing to upload. All DB files exist in B2.')
      return
    }

    if (!fs.existsSync(args.source) || !fs.statSync(args.source).isDirectory()) {
      throw new Error(`--source is not a directory: ${args.source}`)
    }

    if (args.dryRun) {
      console.log(`\nDry-run: would upload ${missing.length} files from: ${args.source}`)
      console.log('Re-run with --apply to actually upload.')
      return
    }

    console.log(`\nUploading ${missing.length} files from: ${args.source}`)

    let uploaded = 0
    let notFound = 0

    for (const m of missing) {
      const localPath = await findLocalFile(args.source, m.categoria, m.fileName)
      if (!localPath) {
        notFound++
        console.warn(`- NOT FOUND locally: ${m.key}`)
        continue
      }

      if (args.verbose) console.log(`- Uploading ${m.key} <- ${localPath}`)

      await client.send(
        new PutObjectCommand({
          Bucket: b2.bucket,
          Key: m.key,
          Body: fs.createReadStream(localPath),
          ContentType: inferContentType(m.fileName),
        })
      )

      uploaded++
    }

    console.log(`\nUpload done. Uploaded: ${uploaded}. Not found locally: ${notFound}.`) 

    if (notFound > 0) {
      process.exitCode = 3
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  const isVerbose = process.argv.includes('--verbose') || process.argv.includes('-v')

  if (isVerbose) {
    const meta = err?.$metadata
    const details = {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      Code: err?.Code,
      httpStatusCode: meta?.httpStatusCode,
      requestId: meta?.requestId,
      extendedRequestId: meta?.extendedRequestId,
      cfId: meta?.cfId,
    }

    console.error('B2/S3 error details:', JSON.stringify(details, null, 2))
  }

  console.error(err?.message || err)
  process.exit(1)
})
