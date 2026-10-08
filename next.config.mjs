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
  async rewrites() {
    return [
      // WordPress.com connection checks (Site Health, Google/Meta plugin
      // auth) expect xmlrpc.php on the Site Address. Proxy it to the WP
      // backend — the split-URL setup would otherwise 404 it.
      { source: '/xmlrpc.php', destination: 'https://edenapi.indemos.com/xmlrpc.php' },
    ];
  },
  async redirects() {
    return [
      // Legacy WooCommerce endpoints -> headless equivalents (301).
      { source: '/my-account/:path*', destination: '/account', permanent: true },
      { source: '/shop/:path*', destination: '/catalog', permanent: true },
      // Category archives now live on /catalog?category= (301).
      // Single-segment URLs redirect here (this runs before the [slug] page,
      // which would otherwise shadow the catch-all for one-segment paths).
      { source: '/product-category/:slug', destination: '/catalog?category=:slug', permanent: true },
      // Multi-segment hierarchical legacy URLs fall through to
      // app/product-category/[[...path]]/page.tsx, which resolves the deepest
      // valid slug from the path.
      // Legacy WP blog taxonomy archives -> magazine (301).
      { source: '/category/:slug', destination: '/magazine/:slug', permanent: true },
      { source: '/tag/:slug', destination: '/magazine/:slug', permanent: true },
      // Product tags have no filtered view -> catalog root (301).
      { source: '/product-tag/:slug', destination: '/catalog', permanent: true },
      // The standalone bag page is retired: the bag lives in the drawer
      // and the order summary on /checkout (301).
      { source: '/cart', destination: '/checkout', permanent: true },
      // WooCommerce-style sharable checkout URLs (Meta shop links):
      // /checkout-link?products=ID:QTY,…&coupon=CODE lands on /checkout,
      // which imports the bundle itself. Query string passes through.
      { source: '/checkout-link', destination: '/checkout', permanent: true },
    ];
  },
};

export default nextConfig;
