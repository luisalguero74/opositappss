#!/usr/bin/env node

import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'
import fs from 'node:fs'

function readEnvFileKeys({ filePath, keys, override }) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  const wanted = new Set(keys)

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
    value = value.replace(/\\n+$/, '').trim()
    process.env[key] = value
  }
}

function ensureProdEnvLoaded() {
  const keys = [
    'B2_REPOSITORY_S3_BUCKET',
    'B2_REPOSITORY_BUCKET',
    'B2_REPOSITORY_S3_ENDPOINT',
    'B2_REPOSITORY_S3_REGION',
    'B2_REPOSITORY_S3_ACCESS_KEY_ID',
    'B2_REPOSITORY_S3_SECRET_ACCESS_KEY',
    'B2_S3_ENDPOINT',
    'B2_S3_REGION',
    'B2_S3_ACCESS_KEY_ID',
    'B2_S3_SECRET_ACCESS_KEY',
    'B2_KEY_ID',
    'B2_APPLICATION_KEY',
  ]

  readEnvFileKeys({ filePath: '.env.vercel.production', keys, override: true })
  readEnvFileKeys({ filePath: '.env.production.local', keys, override: true })
  readEnvFileKeys({ filePath: '.env.production', keys, override: true })
}

function normalizeEndpoint(endpoint) {
  const trimmed = String(endpoint || '').trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function getCfg() {
  const endpoint = process.env.B2_REPOSITORY_S3_ENDPOINT || process.env.B2_S3_ENDPOINT
  const region = process.env.B2_REPOSITORY_S3_REGION || process.env.B2_S3_REGION || 'us-east-1'
  const accessKeyId =
    process.env.B2_REPOSITORY_S3_ACCESS_KEY_ID ||
    process.env.B2_S3_ACCESS_KEY_ID ||
    process.env.B2_KEY_ID
  const secretAccessKey =
    process.env.B2_REPOSITORY_S3_SECRET_ACCESS_KEY ||
    process.env.B2_S3_SECRET_ACCESS_KEY ||
    process.env.B2_APPLICATION_KEY
  const bucket =
    process.env.B2_REPOSITORY_S3_BUCKET ||
    process.env.B2_REPOSITORY_BUCKET

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null

  return { endpoint, region, accessKeyId, secretAccessKey, bucket }
}

function parseArgs(argv) {
  const args = {
    env: 'prod',
    apply: false,
    origins: ['https://www.opositapp.site'],
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') args.apply = true
    else if (a === '--dry-run') args.apply = false
    else if (a === '--env') args.env = String(argv[++i] || 'prod')
    else if (a === '--origin') args.origins.push(String(argv[++i] || ''))
    else if (a === '--help' || a === '-h') args.help = true
  }

  args.origins = args.origins.map((o) => o.trim()).filter(Boolean)
  return args
}

function printUsage() {
  console.log(`\nSet CORS for B2 repository bucket (S3-compatible)\n\nUsage:\n  node scripts/b2-repository-set-cors.mjs [--apply] [--dry-run] [--env prod] [--origin <extraOrigin>]\n\nDefault origin:\n  https://www.opositapp.site\n\nExamples:\n  # Show what would be applied\n  node scripts/b2-repository-set-cors.mjs --dry-run\n\n  # Apply for production using .env.vercel.production/.env.production*\n  node scripts/b2-repository-set-cors.mjs --apply\n\n  # Also allow a Vercel preview domain\n  node scripts/b2-repository-set-cors.mjs --apply --origin https://opositappss-xxxx.vercel.app\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printUsage()
    process.exit(0)
  }

  if (args.env === 'prod' || args.env === 'production') {
    ensureProdEnvLoaded()
  }

  const cfg = getCfg()
  if (!cfg) {
    console.error('Missing B2 repository env vars (endpoint/credentials/bucket).')
    process.exit(1)
  }

  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: args.origins,
        AllowedMethods: ['GET', 'HEAD', 'PUT'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  }

  console.log('Bucket:', cfg.bucket)
  console.log('Endpoint:', normalizeEndpoint(cfg.endpoint).replace(/^https?:\/\//, ''))
  console.log('Origins:', args.origins.join(', '))
  console.log('Mode:', args.apply ? 'APPLY' : 'DRY-RUN')

  if (!args.apply) return

  const client = new S3Client({
    region: cfg.region,
    endpoint: normalizeEndpoint(cfg.endpoint),
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })

  await client.send(
    new PutBucketCorsCommand({
      Bucket: cfg.bucket,
      CORSConfiguration: corsConfiguration,
    })
  )

  console.log('CORS updated successfully.')
}

main().catch((e) => {
  console.error(e?.message || e)
  process.exit(1)
})
