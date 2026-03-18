function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
  databaseUrl: requireEnv("DATABASE_URL"),
  nextauthSecret: requireEnv("NEXTAUTH_SECRET"),
  s3Bucket: requireEnv("S3_BUCKET"),
  awsAccessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
  awsSecretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  // Optional: set for MinIO / non-AWS S3 endpoints, leave unset for AWS S3
  s3Endpoint: process.env.S3_ENDPOINT,
} as const
