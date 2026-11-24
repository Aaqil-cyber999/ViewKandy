import type { NextConfig } from "next";

/**
 * Baseline CSP for the current app: Cesium workers, Leaflet tiles, Next.js
 * inline styles and optional Google/Cesium scripts all need a permissive
 * script/style allowlist today. The structural directives still block plugins,
 * framing, base-tag injection and cross-site form posts.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Playwright reaches the dev server through 127.0.0.1; Next treats that as a
  // cross-origin dev request unless it is explicitly allowed.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Remote photography is only used from sources we control or that are
    // explicitly licensed for hot-linking. Everything else is a local asset.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      // Public objects from the project's own Supabase Storage bucket, used
      // after `npm run images:upload` registers place photographs in the DB.
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            // Browsers ignore HSTS over plain HTTP, so this is safe in local
            // development while still protecting real HTTPS deployments.
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        // Cesium's static runtime is large and immutable; cache it hard.
        source: "/cesium/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
