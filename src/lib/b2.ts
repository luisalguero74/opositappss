import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name} for Backblaze B2 configuration`)
  }
  return value
}

function getRegionFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    const host = url.hostname // e.g. s3.eu-central-003.backblazeb2.com
    const parts = host.split('.')
    // parts[1] should be the region (eu-central-003). Fallback to us-west-004 if not parseable.
    return parts[1] || 'us-west-004'
  } catch {
    return 'us-west-004'
  }
}

let cachedClient: S3Client | null = null

export function getB2Client(): S3Client {
  if (cachedClient) return cachedClient

  const endpoint = getRequiredEnv('B2_S3_ENDPOINT')
  const accessKeyId = getRequiredEnv('B2_KEY_ID')
  const secretAccessKey = getRequiredEnv('B2_APPLICATION_KEY')
  const region = getRegionFromEndpoint(endpoint)

  cachedClient = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  })

  return cachedClient
}

export async function listB2BucketObjects(prefix?: string) {
  const bucket = getRequiredEnv('B2_BUCKET_NAME')
  const client = getB2Client()

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 50,
  })

  const result = await client.send(command)
  return result.Contents || []
}

export async function getB2DownloadUrl(params: {
  key: string
  expiresInSeconds?: number
}) {
  const bucket = getRequiredEnv('B2_BUCKET_NAME')
  const client = getB2Client()
  const { key, expiresInSeconds = 600 } = params

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const url = await getSignedUrl(client, command, { expiresIn: expiresInSeconds })
  return url
}
