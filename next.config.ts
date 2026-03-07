import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-eval' 'unsafe-inline' data: blob:; connect-src * ws: wss:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
