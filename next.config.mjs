/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // We run ESLint separately via `npm run lint` with ESLint v9 flat config.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", process.env.NEXTAUTH_URL ?? ""] },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" }, // AWS S3
      { protocol: "http", hostname: "localhost" },         // MinIO local
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
}

export default nextConfig
