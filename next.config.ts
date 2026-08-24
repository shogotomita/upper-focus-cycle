import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  // 127.0.0.1 で開くと JS chunk が 403 になり、画面が静的のままクリック不能になる
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
