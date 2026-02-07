import { NextResponse } from 'next/server'
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type RemoteFile = {
  url: string
  contentType?: string
  fileName?: string
  disposition?: 'attachment' | 'inline'
  range?: string | null
}

export type B2S3Config = {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

function normalizeEndpoint(endpoint: string) {
  const trimmed = endpoint.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function getRegionFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(normalizeEndpoint(endpoint))
    const host = url.hostname // e.g. s3.eu-central-003.backblazeb2.com
    const parts = host.split('.')
    return parts[1] || 'us-west-004'
  } catch {
    return 'us-west-004'
  }
}

function inferContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'epub':
      return 'application/epub+zip'
    default:
      return 'application/octet-stream'
  }
}

export async function proxyRemoteFile({ url, contentType, fileName, disposition = 'attachment', range }: RemoteFile) {
  const headers: Record<string, string> = {}
  if (range) headers['Range'] = range

  const res = await fetch(url, {
    headers,
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Archivo no encontrado en almacenamiento remoto', status: res.status },
      { status: res.status === 404 ? 404 : 502 }
    )
  }

  const resolvedName = fileName || url.split('/').pop() || 'file'
  const resolvedType = contentType || inferContentType(resolvedName)

  const contentDisposition = `${disposition}; filename="${encodeURIComponent(resolvedName)}"`

  // Stream passthrough (no buffering in memory)
  const upstreamHeaders = res.headers
  const passthroughHeaders: Record<string, string> = {
    'Content-Type': upstreamHeaders.get('content-type') || resolvedType,
    'Content-Disposition': contentDisposition,
    'Cache-Control': 'private, max-age=60',
  }

  const contentRange = upstreamHeaders.get('content-range')
  if (contentRange) passthroughHeaders['Content-Range'] = contentRange

  const acceptRanges = upstreamHeaders.get('accept-ranges')
  if (acceptRanges) passthroughHeaders['Accept-Ranges'] = acceptRanges

  const contentLength = upstreamHeaders.get('content-length')
  if (contentLength) passthroughHeaders['Content-Length'] = contentLength

  const etag = upstreamHeaders.get('etag')
  if (etag) passthroughHeaders['ETag'] = etag

  const lastModified = upstreamHeaders.get('last-modified')
  if (lastModified) passthroughHeaders['Last-Modified'] = lastModified

  return new NextResponse(res.body, {
    status: res.status,
    headers: passthroughHeaders,
  })
}

export function getB2S3ConfigFromEnv(): B2S3Config | null {
  const endpoint = process.env.B2_S3_ENDPOINT
  const region = process.env.B2_S3_REGION
  const accessKeyId = process.env.B2_S3_ACCESS_KEY_ID || process.env.B2_KEY_ID
  const secretAccessKey = process.env.B2_S3_SECRET_ACCESS_KEY || process.env.B2_APPLICATION_KEY
  const bucket = process.env.B2_S3_BUCKET || process.env.B2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null

  return { endpoint, region: region || getRegionFromEndpoint(endpoint), accessKeyId, secretAccessKey, bucket }
}

export function getB2TemarioS3ConfigFromEnv(): B2S3Config | null {
  // Allow temario to use its own bucket (recommended), while reusing the same
  // endpoint/region/credentials unless explicitly overridden.
  const endpoint = process.env.B2_TEMARIO_S3_ENDPOINT || process.env.B2_S3_ENDPOINT
  const region = process.env.B2_TEMARIO_S3_REGION || process.env.B2_S3_REGION
  const accessKeyId =
    process.env.B2_TEMARIO_S3_ACCESS_KEY_ID || process.env.B2_S3_ACCESS_KEY_ID || process.env.B2_KEY_ID
  const secretAccessKey =
    process.env.B2_TEMARIO_S3_SECRET_ACCESS_KEY ||
    process.env.B2_S3_SECRET_ACCESS_KEY ||
    process.env.B2_APPLICATION_KEY
  const bucket =
    process.env.B2_TEMARIO_S3_BUCKET ||
    process.env.B2_TEMARIO_BUCKET ||
    process.env.B2_S3_BUCKET ||
    process.env.B2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null

  return { endpoint, region: region || getRegionFromEndpoint(endpoint), accessKeyId, secretAccessKey, bucket }
}

export function getB2RepositoryS3ConfigFromEnv(): B2S3Config | null {
  // Allow repository to use its own bucket (recommended), while reusing the same
  // endpoint/region/credentials unless explicitly overridden.
  const endpoint = process.env.B2_REPOSITORY_S3_ENDPOINT || process.env.B2_S3_ENDPOINT
  const region = process.env.B2_REPOSITORY_S3_REGION || process.env.B2_S3_REGION
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
    process.env.B2_REPOSITORY_BUCKET ||
    process.env.B2_S3_BUCKET ||
    process.env.B2_BUCKET_NAME

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null

  return { endpoint, region: region || getRegionFromEndpoint(endpoint), accessKeyId, secretAccessKey, bucket }
}

function createB2S3Client(cfg: B2S3Config) {
  return new S3Client({
    region: cfg.region,
    endpoint: normalizeEndpoint(cfg.endpoint),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    forcePathStyle: true,
  })
}

export async function presignB2GetObjectUrl(cfg: B2S3Config, key: string, expiresInSeconds = 60) {
  const client = createB2S3Client(cfg)
  const command = new GetObjectCommand({ Bucket: cfg.bucket, Key: key })
  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export async function presignB2PutObjectUrl(
  cfg: B2S3Config,
  key: string,
  options?: { contentType?: string; expiresInSeconds?: number }
) {
  const client = createB2S3Client(cfg)
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: options?.contentType,
  })
  return await getSignedUrl(client, command, { expiresIn: options?.expiresInSeconds ?? 60 })
}

export async function putB2Object(
  cfg: B2S3Config,
  params: { key: string; body: any; contentType?: string }
) {
  const client = createB2S3Client(cfg)
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  })
  await client.send(command)
}

export async function deleteB2Object(cfg: B2S3Config, key: string) {
  const client = createB2S3Client(cfg)
  const command = new DeleteObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  })
  await client.send(command)
}

export async function listB2Objects(cfg: B2S3Config, prefix: string) {
  const client = createB2S3Client(cfg)
  const command = new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix })
  const result = await client.send(command)
  const contents = result.Contents || []
  return contents
    .map((o) => o.Key)
    .filter((k): k is string => Boolean(k))
    .map((k) => k.substring(prefix.length))
    .filter((name) => name && !name.endsWith('/'))
}

export function buildRemoteTemarioUrl(baseUrl: string, categoria: string, fileName: string) {
  const trimmed = baseUrl.replace(/\/+$/, '')
  const safeCategoria = encodeURIComponent(categoria)
  const safeFile = encodeURIComponent(fileName)
  return `${trimmed}/${safeCategoria}/${safeFile}`
}
