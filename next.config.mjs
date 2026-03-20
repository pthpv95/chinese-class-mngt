/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    prefetchInlining: true,
    useCache: true,
    staleTimes: {
      dynamic: 60,  // cache dynamic pages for 30s in the client router cache
      static: 300,  // cache static pages for 5min
    },
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
