import { permanentRedirect } from 'next/navigation';
import { getCategories } from '@/lib/woo';

// Legacy hierarchical WooCommerce category URLs, e.g.
//   /product-category/health-beauty/personal-care/cosmetics/perfumes-colognes
// The old site stacked category slugs hierarchically; the storefront uses
// flat /catalog?category=<slug>. Resolve the deepest segment that matches a
// real category and 301 there (preserves relevance and link equity); fall
// back to /catalog when nothing matches. This replaces the single-segment
// next.config.mjs redirect with slug validation.
export default async function LegacyCategoryRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const segments = path ?? [];

  let destination: string | null = null;
  if (segments.length > 0) {
    const cats = await getCategories().catch(() => []);
    const slugs = new Set(cats.map((c) => c.slug));
    for (let i = segments.length - 1; i >= 0; i--) {
      if (slugs.has(segments[i])) {
        destination = `/catalog?category=${segments[i]}`;
        break;
      }
    }
  }

  permanentRedirect(destination ?? '/catalog');
}
