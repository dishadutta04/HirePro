/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // The e2e tests build into their own folder so they can run next to `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
