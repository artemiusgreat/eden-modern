import type { StoreProduct } from './woo';
import { stripHtml } from './format';
import { env } from './env';

// Read lazily: this module must stay import-safe even if a client
// component ever imports it (see lib/env.ts).
const siteBase = (): string => env.NEXT_PUBLIC_SITE_URL;

export function siteUrl(path: string): string {
  return `${siteBase()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Minor-units price string -> major-units number for schema.org. */
function majorUnits(price: string, minorUnit: number): number {
  const n = parseInt(price, 10);
  return Number.isFinite(n) ? n / Math.pow(10, minorUnit) : 0;
}

/** Brand from the pa_brand attribute, if the product has one. */
function brandOf(p: StoreProduct): string | undefined {
  const attr = p.attributes.find((a) => a.taxonomy === 'pa_brand');
  return attr?.terms[0]?.name;
}

/**
 * schema.org Product JSON-LD, built from the already-fetched StoreProduct —
 * no extra API calls. Powers Google rich snippets (price, availability,
 * rating) on product pages.
 */
export function productJsonLd(p: StoreProduct): Record<string, unknown> {
  const price = majorUnits(p.prices.price, p.prices.currency_minor_unit);
  const brand = brandOf(p);
  const desc = stripHtml(p.short_description || p.description).slice(0, 500);
  const rating = parseFloat(p.average_rating);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url: siteUrl(`/products/${p.slug}`),
    description: desc || undefined,
    sku: p.sku || undefined,
    image: p.images.map((i) => i.src),
    brand: brand ? { '@type': 'Brand', name: brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: siteUrl(`/products/${p.slug}`),
      priceCurrency: p.prices.currency_code,
      price: price.toFixed(p.prices.currency_minor_unit),
      availability: p.is_in_stock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
  if (Number.isFinite(rating) && rating > 0 && p.review_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount: p.review_count,
    };
  }
  return schema;
}

/** Organization + WebSite schema for the homepage. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Eden by Indemos',
    legalName: 'Indemos LLC',
    url: siteBase(),
    email: 'service@indemos.com',
    description:
      'Eden by Indemos (Indemos LLC) is a US online retailer of skincare, cosmetics, and designer fragrances.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Store 1250, 701 State Route 440 Ste 16',
      addressLocality: 'Jersey City',
      addressRegion: 'NJ',
      postalCode: '07304',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'service@indemos.com',
      contactType: 'customer service',
    },
    sameAs: [
      'https://www.linkedin.com/company/eden-indemos',
      'https://www.facebook.com/people/Eden-Indemos/61588893673349',
      'https://www.instagram.com/eden.indemos',
      'https://www.threads.com/@eden.indemos',
      'https://www.pinterest.com/edenindemos',
      'https://www.youtube.com/@eden-indemos',
      'https://www.tiktok.com/@eden.indemos',
      'https://x.com/edenindemos',
      'https://www.trustpilot.com/review/eden.indemos.com',
    ],
  };
}
