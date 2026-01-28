import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var ${name}`)
  }
  return value
}

function getRegionFromEndpoint(endpoint) {
  try {
    const url = new URL(endpoint)
    const host = url.hostname // e.g. s3.eu-central-003.backblazeb2.com
    const parts = host.split('.')
    return parts[1] || 'us-west-004'
  } catch {
    return 'us-west-004'
  }
}

async function main() {
  const endpoint = getRequiredEnv('B2_S3_ENDPOINT')
  const accessKeyId = getRequiredEnv('B2_KEY_ID')
  const secretAccessKey = getRequiredEnv('B2_APPLICATION_KEY')
  const bucket = getRequiredEnv('B2_BUCKET_NAME')
  const region = getRegionFromEndpoint(endpoint)

  const client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  })

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    MaxKeys: 20,
  })

  const result = await client.send(command)

  console.log('Bucket:', bucket)
  console.log('Region:', region)
  console.log('Endpoint:', endpoint)
  console.log('Objects:')

  for (const obj of result.Contents || []) {
    console.log('-', obj.Key, obj.Size, 'bytes')
  }

  if (!result.Contents || result.Contents.length === 0) {
    console.log('(no objects found yet)')
  }
}

main().catch((err) => {
  console.error('Error testing B2 connection:', err)
  process.exit(1)
})
