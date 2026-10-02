import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@luminar-iq/shared"],
  async rewrites() {
    const apiPort = process.env.NEXT_PUBLIC_API_PORT ?? "4010";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${apiPort}`;

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
