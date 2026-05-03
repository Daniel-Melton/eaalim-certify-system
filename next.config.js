/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Fabric.js requires canvas which is Node-only; stub it on the server
    config.externals = [...(config.externals || []), { canvas: 'commonjs canvas' }];
    return config;
  },
};
module.exports = nextConfig;
