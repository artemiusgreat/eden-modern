/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eden.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
      // Post-migration WordPress host (WP moves to wp.indemos.com — one
      // subdomain level, covered by the *.indemos.com Cloudflare cert).
      {
        protocol: 'https',
        hostname: 'wp.indemos.com',
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
