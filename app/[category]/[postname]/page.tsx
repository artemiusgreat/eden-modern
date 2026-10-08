import { env } from '@/lib/env';
import { notFound, permanentRedirect } from 'next/navigation';

// WP backend host — moved to edenapi.indemos.com at the headless cutover.
const WP = env.WC_STORE_URL;

/**
 * Legacy WordPress permalink catcher. Posts used to live at
 * /%category%/%postname%/ (e.g. /news/fragrance-launch/). Look the post up
 * by slug and permanently redirect (301) to its canonical magazine URL.
 * The category segment is not validated — resolving by postname alone is
 * more forgiving than WordPress itself when a post's category changes.
 * Anything that isn't a post slug falls through to the 404 page.
 *
 * More specific routes (/products/[slug], /product-category/[slug],
 * /magazine/[slug], …) take precedence, so this only catches otherwise
 * unmatched two-segment paths.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyPostRedirect({
  params,
}: {
  params: Promise<{ category: string; postname: string }>;
}) {
  const { postname } = await params;
  // NOTE: permanentRedirect() works by throwing, so it must live OUTSIDE the
  // try/catch — otherwise our own catch swallows the redirect as an error.
  let slug: string | null = null;
  try {
    const res = await fetch(
      `${WP}/wp-json/wp/v2/posts?slug=${encodeURIComponent(postname)}&_fields=slug`,
      { cache: 'no-store' }
    );
    const list = (await res.json().catch(() => null)) as Array<{
      slug?: string;
    }> | null;
    slug = res.ok && Array.isArray(list) ? (list[0]?.slug ?? null) : null;
  } catch {
    slug = null;
  }
  if (slug) permanentRedirect(`/magazine/${slug}`);
  notFound();
}
