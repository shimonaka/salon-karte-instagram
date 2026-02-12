import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;
let assetPrefix = "";
let basePath = "";

if (isGithubActions) {
  const repo = "salon-karte-instagram";
  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: basePath,
  assetPrefix: assetPrefix,
};

export default nextConfig;
