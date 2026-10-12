/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Go development proxy keeps UI, API and the HMR socket on :3000.
  // The standalone :3002 command can still reach the same API.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || "http://127.0.0.1:3000";
    return [
      { source: "/action", destination: `${api}/action` },
      { source: "/media/:path*", destination: `${api}/media/:path*` },
    ];
  },
};
export default nextConfig;
