/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eden.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
      // Post-migration WordPress host (WP moves to a subdomain; the apex
      // entry stays so transitional URLs keep working).
      {
        protocol: 'https',
        hostname: 'wp.eden.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  async redirects() {
    return [
      // Legacy WooCommerce endpoints -> headless equivalents (301).
      { source: '/my-account/:path*', destination: '/account', permanent: true },
      { source: '/shop/:path*', destination: '/catalog', permanent: true },
    ];
  },
};

export default nextConfig;
