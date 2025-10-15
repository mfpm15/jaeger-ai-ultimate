/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true
  },
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
