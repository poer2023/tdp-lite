import type { NextConfig } from "next";

function resolveApiProxyTarget(): string {
  const candidates = [
    process.env.TDP_API_BASE_URL,
    process.env.NEXT_PUBLIC_TDP_API_BASE_URL,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.replace(/\/$/, "");
    }
  }

  return "";
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    // Some local DNS/proxy tools resolve public image CDNs to 198.18.x.x.
    // Allowing local IP avoids false blocking in that setup.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "assets.dybzy.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
  async rewrites() {
    const proxyTarget = resolveApiProxyTarget();
    const beforeFiles = [
      // Some clients still prefetch an older hashed route stylesheet. Serve a
      // harmless fallback instead of a cached 404.
      {
        source: "/_next/static/chunks/73c6ec51f23b741b.css",
        destination: "/legacy-prefetch-fallback.css",
      },
    ];

    const afterFiles = proxyTarget
      ? [
          {
            source: "/v1/:path*",
            destination: `${proxyTarget}/v1/:path*`,
          },
          {
            source: "/healthz",
            destination: `${proxyTarget}/healthz`,
          },
          {
            source: "/readyz",
            destination: `${proxyTarget}/readyz`,
          },
        ]
      : [];

    return {
      beforeFiles,
      afterFiles,
    };
  },
};

export default nextConfig;
