import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure static assets and CSS are emitted for Netlify runtime
  productionBrowserSourceMaps: false,
};

export default nextConfig;
