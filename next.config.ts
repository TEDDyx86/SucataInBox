import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cblow.xyz",
        port: "",
        pathname: "/logo.svg",
        search: "",
      },
    ],
  },
};

export default nextConfig;
