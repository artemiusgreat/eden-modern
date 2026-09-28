/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eden.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
