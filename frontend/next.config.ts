import type { NextConfig } from "next";
import path from "node:path";

// Server-side target for the /api proxy. Not exposed to the browser.
const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET || "http://127.0.0.1:4000"
).replace(/\/+$/, "");

const config: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  // Same-origin API: the browser calls /api on this host and Next forwards it
  // to the NestJS backend, so localhost vs 127.0.0.1 and CORS never matter.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` },
    ];
  },
};

export default config;
