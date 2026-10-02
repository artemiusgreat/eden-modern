import type { MetadataRoute } from 'next';
import { getProductsPaged, getCategories, getPosts } from '@/lib/woo';

// Canonical public URL of the storefront (what Google/FB/Pinterest should index).
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eden.indemos.com').replace(/\/$/, '');

/**
 * Sitemap for the headless cutover: every URL matches the legacy
 * WordPress/WooCommerce structure 1:1 (/products/{slug},
 * /product-category/{slug}, /magazine/{slug}), so product links already
 * circulating in Facebook/Google/Pinterest keep resolving without redirects.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/catalog`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/magazine`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/contacts`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/refunds-and-returns`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // All products (paged) — each failure mode degrades to "no entries"
  // rather than killing the whole sitemap.
  try {
    let page = 1;
    for (;;) {
      const { products, totalPages } = await getProductsPaged({ per_page: 100, page });
      for (const p of products) {
        if (p.slug) {
          entries.push({
            url: `${SITE}/products/${p.slug}`,
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      }
      if (page >= (totalPages || 0) || products.length === 0) break;
      page += 1;
    }
  } catch {
    /* leave product entries out rather than 500ing the sitemap */
  }

  // Categories.
  try {
    const cats = await getCategories();
    for (const c of cats) {
      if (c.slug) {
        entries.push({
          url: `${SITE}/product-category/${c.slug}`,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // Magazine posts.
  try {
    const posts = await getPosts(100);
    for (const p of posts) {
      entries.push({
        url: `${SITE}/magazine/${p.slug}`,
        lastModified: p.date ? new Date(p.date) : undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    /* ignore */
  }

  return entries;
}
