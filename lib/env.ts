function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
  get databaseUrl() { return requireEnv("DATABASE_URL") },
  get nextauthSecret() { return requireEnv("NEXTAUTH_SECRET") },
  get s3Bucket() { return requireEnv("S3_BUCKET") },
  get awsAccessKeyId() { return requireEnv("AWS_ACCESS_KEY_ID") },
  get awsSecretAccessKey() { return requireEnv("AWS_SECRET_ACCESS_KEY") },
  get awsRegion() { return process.env.AWS_REGION ?? "us-east-1" },
  get s3Endpoint() { return process.env.S3_ENDPOINT },
} as const
