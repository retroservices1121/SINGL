import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  // Tree-shake large barrel-exported packages so each route only bundles the
  // components it actually imports (AGG's UI lib especially is a big barrel).
  experimental: {
    optimizePackageImports: ['@agg-build/ui', '@agg-build/hooks', 'recharts'],
  },
};

export default nextConfig;
