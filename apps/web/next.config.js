/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', // Optimized for Docker deployment
    images: {
        domains: ['localhost', 'graph.facebook.com', 'api.convoo.cloud', 'app.convoo.cloud'],
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
};

module.exports = nextConfig;
