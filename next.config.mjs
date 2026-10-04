/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eden.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
      // Post-migration WordPress host (WP moves to edenapi.indemos.com —
      // one subdomain level, covered by the *.indemos.com Cloudflare cert).
      {
        protocol: 'https',
        hostname: 'edenapi.indemos.com',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
  async redirects() {
    return [
      // Legacy WooCommerce endpoints -> headless equivalents (301).
      { source: '/my-account/:path*', destination: '/account', permanent: true },
      { source: '/shop/:path*', destination: '/catalog', permanent: true },
      // Category archives now live on /catalog?category= (301).
      { source: '/product-category/:slug', destination: '/catalog?category=:slug', permanent: true },
    ];
  },
};

export default nextConfig;
