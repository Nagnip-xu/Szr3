import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SZR3_ADMIN_INSTANCE === "1" ? ".next-admin" : ".next",
  // The admin process shares a domain with the user app but has its own build.
  // Prefix its static assets so Nginx can route them to the correct process.
  assetPrefix: process.env.SZR3_ADMIN_INSTANCE === "1" ? "/admin" : undefined,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Long Fish-Speech requests commonly take 50-90 seconds on a full script.
    // Keep the same-origin rewrite alive instead of returning a proxy 500 at 30s.
    proxyTimeout: 360_000,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "img.alicdn.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/assets/files/**",
      },
    ],
  },
  async rewrites() {
    const api =
      process.env.SZR3_API_PROXY ?? "http://127.0.0.1:3001/api";
    return [
      {
        source: "/szr3-api/:path*",
        destination: `${api}/:path*`,
      },
    ];
  },
};

export default nextConfig;
