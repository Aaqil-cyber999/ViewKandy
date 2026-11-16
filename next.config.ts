import type { NextConfig } from "next";

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
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
