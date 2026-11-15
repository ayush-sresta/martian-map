import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" dev-tools badge in the corner during `npm run dev`
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
