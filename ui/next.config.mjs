import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Next.js 16 defaults to Turbopack. Empty object silences the
  // "webpack config and no turbopack config" error and keeps Turbopack
  // as the default bundler. The custom webpack() below only applies
  // when explicitly running with --webpack (NEXT_DEV_WEBPACK=true).
  turbopack: {},
  webpack(config, { dev, isServer }) {
    if (dev && !isServer) {
      config.module.rules.push({
        test: /[\/]next[\/]dist[\/]compiled[\/]mini-css-extract-plugin[\/]hmr[\/]hotModuleReplacement\.js$/,
        enforce: "pre",
        use: [{ loader: fileURLToPath(new URL("./scripts/css-hmr-guard.cjs", import.meta.url)) }],
      });
    }
    return config;
  },
  // Trust only this run's public hostname, including a generated Quick Tunnel.
  // API origin validation stays in Go; never allow *.trycloudflare.com here.
  allowedDevOrigins: process.env.APP_URL
    ? [new URL(process.env.APP_URL).hostname]
    : [],
  // Go development proxy keeps UI, API and the HMR socket on :3000.
  // The standalone :3002 command can still reach the same API.
  async headers(){return [{source:"/sw.js",headers:[{key:"Content-Type",value:"application/javascript; charset=utf-8"},{key:"Cache-Control",value:"no-cache, no-store, must-revalidate"},{key:"Service-Worker-Allowed",value:"/"}]}]},
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || "http://127.0.0.1:3000";
    return [
      { source: "/action", destination: `${api}/action` },
      { source: "/media/:path*", destination: `${api}/media/:path*` },
    ];
  },
};
export default nextConfig;
