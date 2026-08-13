import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "bcryptjs",
    "@prisma/client",
    "@react-pdf/renderer",
  ],

  allowedDevOrigins: [
    "192.168.1.4",
    "http://192.168.1.4:3000",
  ],
};

export default nextConfig;