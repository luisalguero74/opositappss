#!/usr/bin/env node

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'node:fs'
import path from 'node:path'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return 'application/octet-stream'
}

function printUsage() {
  console.log(`\nUsage:\n  node scripts/b2-upload-file.mjs <localFilePath> <key>\n\nRequires env vars:\n  B2_S3_ENDPOINT\n  B2_KEY_ID\n  B2_APPLICATION_KEY\n  B2_BUCKET_NAME\n\nExample:\n  node scripts/b2-upload-file.mjs \\\n    'docs/TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf' \\\n    'repo/temario-especifico/TEMA_05_ESPECIFICO_GESTION_RECAUDATORIA.pdf'\n`)
}

async function main() {
  const localFilePath = process.argv[2]
  const key = process.argv[3]

  if (!localFilePath || !key || process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage()
    process.exit(localFilePath && key ? 0 : 1)
  }

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`)
  }

  const endpoint = requireEnv('B2_S3_ENDPOINT')
  const accessKeyId = requireEnv('B2_KEY_ID')
  const secretAccessKey = requireEnv('B2_APPLICATION_KEY')
  const bucket = requireEnv('B2_BUCKET_NAME')

  const client = new S3Client({
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  })

  const body = fs.createReadStream(localFilePath)
  const contentType = guessContentType(localFilePath)

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )

  console.log('Upload OK')
  console.log(`Bucket: ${bucket}`)
  console.log(`Key: ${key}`)
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})
