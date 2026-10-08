import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

const SITE = env.NEXT_PUBLIC_SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Functional pages: no indexable content, keep crawlers out.
        disallow: ['/api/', '/account', '/checkout', '/search'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
