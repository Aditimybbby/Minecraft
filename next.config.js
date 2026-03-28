/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['rcon-client', 'archiver', 'unzipper'],
  },
}
module.exports = nextConfig
