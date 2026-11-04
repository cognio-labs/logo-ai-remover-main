import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      "@tanstack/react-router": "./src/lib/router-compat.tsx",
    },
  },
  async rewrites() {
    const backendOrigin =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.VITE_API_URL ||
      "http://127.0.0.1:5000";

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/",
        permanent: false,
      },
      {
        source: "/pricing",
        destination: "/",
        permanent: false,
      },
      {
        source: "/upscale",
        destination: "/",
        permanent: false,
      },
      {
        source: "/video-enhancer",
        destination: "/",
        permanent: false,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tanstack/react-router": path.resolve(__dirname, "src/lib/router-compat.tsx"),
    };
    return config;
  },
};

export default nextConfig;
