export const env = {
  get databaseUrl() { return process.env.DATABASE_URL ?? "" },
  get nextauthSecret() { return process.env.NEXTAUTH_SECRET ?? "" },
  get s3Bucket() { return process.env.S3_BUCKET ?? "" },
  get awsAccessKeyId() { return process.env.AWS_ACCESS_KEY_ID ?? "" },
  get awsSecretAccessKey() { return process.env.AWS_SECRET_ACCESS_KEY ?? "" },
  get awsRegion() { return process.env.AWS_REGION ?? "us-east-1" },
  get s3Endpoint() { return process.env.S3_ENDPOINT },
  get anthropicApiKey() { return process.env.ANTHROPIC_API_KEY ?? "" },
} as const
