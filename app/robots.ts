import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eden.indemos.com').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Functional pages: no indexable content, keep crawlers out.
        disallow: ['/api/', '/account', '/cart', '/checkout', '/search'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
