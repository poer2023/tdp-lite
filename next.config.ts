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
    if (!proxyTarget) {
      return [];
    }

    return [
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
    ];
  },
};

export default nextConfig;
