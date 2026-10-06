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
      {
        protocol: "https",
        hostname: "files.kick.com",
        port: "",
        pathname: "/images/user/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
