import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Serverless function config ──
  // clingo-wasm (.wasm + team_assembly.lp) must be traced into the function
  outputFileTracingIncludes: {
    "/api/genome/team": [
      "./node_modules/clingo-wasm/dist/**/*",
      "./graph/team_assembly.lp",
    ],
  },

  // clingo-wasm bundles are large; increase the serverless function size limit
  experimental: {
    serverComponentsExternalPackages: ["clingo-wasm"],
  },
};

export default nextConfig;
