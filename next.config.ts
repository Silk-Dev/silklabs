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
  // (Next 16 moved this out of experimental)
  serverExternalPackages: ["clingo-wasm", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
