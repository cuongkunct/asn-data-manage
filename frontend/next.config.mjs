/** @type {import('next').NextConfig} */
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const backendApiUrl = rawApiUrl.replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;
