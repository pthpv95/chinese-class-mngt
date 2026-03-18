import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function createS3Client() {
  const endpoint = process.env.S3_ENDPOINT // set for MinIO, unset for AWS S3
  return new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  })
}

const BUCKET = () => process.env.S3_BUCKET ?? "audio"

/** Returns a presigned PUT URL for direct client upload (expires in 5 min) */
export async function createPresignedUploadUrl(
  filePath: string,
  mimeType: string
): Promise<{ signedUrl: string; filePath: string }> {
  const client = createS3Client()
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: filePath,
    ContentType: mimeType,
  })
  const signedUrl = await getSignedUrl(client, command, { expiresIn: 300 })
  return { signedUrl, filePath }
}

/** Returns a presigned GET URL for playback (expires in 1 hour) */
export async function createPresignedDownloadUrl(filePath: string): Promise<string> {
  const client = createS3Client()
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: filePath })
  return getSignedUrl(client, command, { expiresIn: 3600 })
}
