/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@possiblewebsite/db'],
};

module.exports = nextConfig;
