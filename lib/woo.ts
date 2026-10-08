/**
 * Typed client for the WooCommerce Store API (wc/store/v1) plus the
 * WordPress REST API (wp/v2) for blog posts and info pages.
 * Server-side only: uses WC_STORE_URL (never NEXT_PUBLIC_*).
 */
import { cache } from 'react';
import { env } from './env';

/** Woo sometimes returns HTML entities (e.g. "Health &amp; Beauty") in plain-text
 *  fields. Decode them before rendering so "&" shows as "&". */
const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
};

export function decodeEntities(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isNaN(n) ? m : String.fromCodePoint(n);
    }
    return NAMED_ENTITIES[m] ?? m;
  });
}

export interface StoreImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
}

export interface StorePrices {
  price: string; // minor units, e.g. "3683" = $36.83
  regular_price: string;
  sale_price: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
}

export interface StoreCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
  image: StoreImage | null;
  permalink?: string;
}

export interface StoreAttribute {
  id: number;
  name: string;
  taxonomy: string;
  has_variations: boolean;
  terms: { id: number; name: string; slug: string; default: boolean }[];
}

export interface StoreProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  description: string;
  short_description: string;
  sku: string;
  prices: StorePrices;
  on_sale: boolean;
  average_rating: string;
  review_count: number;
  images: StoreImage[];
  categories: { id: number; name: string; slug: string; link: string }[];
  tags: { id: number; name: string; slug: string }[];
  attributes: StoreAttribute[];
  variations: { id: number; attributes: Record<string, string> }[];
  is_purchasable: boolean;
  is_in_stock: boolean;
  stock_availability: { text: string; class: string };
  add_to_cart: { minimum: number; maximum: number; multiple_of: number };
}

export interface StoreCartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  short_description: string;
  sku: string;
  permalink: string;
  images: { id: number; src: string; thumbnail: string; alt: string; name: string }[];
  prices: StorePrices & { line_subtotal: string; line_total: string };
  totals: { line_subtotal: string; line_total: string };
}

export interface StoreCart {
  items: StoreCartItem[];
  items_count: number;
  totals: {
    total_items: string;
    total_price: string;
    currency_minor_unit: number;
    currency_symbol: string;
  };
}

/** WordPress blog post (wp/v2). */
export interface WpPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  image: string | null;
}

/** WordPress info page (wp/v2/pages): privacy, refunds, contacts. */
export interface WpPage {
  title: string;
  content: string;
}

function apiUrl(base: string, params: Record<string, string | number | undefined> = {}) {
  // Read lazily: this module is imported (for types/helpers) by client
  // components, where server env values don't exist.
  const url = new URL(base, env.WC_STORE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function wooGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const res = await fetch(apiUrl(`/wp-json/wc/store/v1${path}`, params), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // ISR: revalidate catalog data hourly
  });
  if (!res.ok) {
    throw new Error(`Woo Store API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function wpGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const res = await fetch(apiUrl(`/wp-json/wp/v2${path}`, params), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`WP API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function decodeProduct(p: StoreProduct): StoreProduct {
  p.name = decodeEntities(p.name);
  p.categories = p.categories.map((c) => ({ ...c, name: decodeEntities(c.name) }));
  return p;
}

export interface ProductQuery {
  per_page?: number;
  page?: number;
  category?: number;
  search?: string;
  slug?: string;
  on_sale?: boolean;
  min_price?: number; // minor units; listings pass 1 to exclude $0 products
  orderby?: 'menu_order' | 'popularity' | 'rating' | 'date' | 'price' | 'price-desc';
}

function productParams(q: ProductQuery): Record<string, string | number | undefined> {
  // 'price-desc' is a UI-level value, not a valid Store API orderby (400s).
  const orderby = q.orderby === 'price-desc' ? 'price' : q.orderby;
  const order =
    q.orderby === 'price-desc' ? 'desc' : q.orderby === 'price' ? 'asc' : undefined;
  return {
    per_page: q.per_page ?? 12,
    page: q.page,
    category: q.category,
    search: q.search,
    slug: q.slug,
    on_sale: q.on_sale ? 'true' : undefined,
    min_price: q.min_price,
    orderby,
    order,
  };
}

export async function getProducts(q: ProductQuery = {}) {
  const products = await wooGet<StoreProduct[]>('/products', productParams(q));
  return products.map(decodeProduct);
}

/** Paged variant of getProducts: also returns the X-WP-TotalPages page count. */
export async function getProductsPaged(q: ProductQuery = {}) {
  const { data, totalPages } = await wooGetPaged<StoreProduct[]>('/products', productParams(q));
  return { products: data.map(decodeProduct), totalPages };
}

export const getProductBySlug = cache(async (slug: string): Promise<StoreProduct | null> => {
  // Fast path: Store API slug query (works for catalog-visible products).
  const products = await getProducts({ slug, per_page: 1 });
  if (products[0]) return products[0];

  // Fallback: the product may be catalog-hidden — invisible to Store API
  // queries (like `?slug=`), the same way hidden products don't appear in
  // WP shop loops. But WP still serves them on direct URL access, so for URL
  // parity we resolve the ID via wp/v2 and fetch by ID: a direct ID lookup
  // bypasses the Store API's visibility filter.
  try {
    const wpProducts = await wpGet<{ id: number; slug: string }[]>('/product', {
      slug,
      per_page: 1,
    } as Record<string, string | number | undefined>);
    const match = wpProducts.find((p) => p.slug === slug);
    if (!match) return null;
    const byId = await wooGet<StoreProduct>(`/products/${match.id}`);
    return decodeProduct(byId);
  } catch {
    return null;
  }
});

export const getCategories = cache(async () => {
  const cats = await wooGet<StoreCategory[]>('/products/categories', {
    per_page: 100,
    hide_empty: 'true',
  } as Record<string, string | number | undefined>);
  return cats.map((c) => ({ ...c, name: decodeEntities(c.name) }));
});

export async function getCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  // NOTE: the Store API ignores the `slug` query param (returns the full list),
  // so filter client-side instead of trusting `cats[0]`.
  const cats = await wooGet<StoreCategory[]>('/products/categories', {
    per_page: 100,
  } as Record<string, string | number | undefined>);
  const c = cats.find((cat) => cat.slug === slug);
  return c ? { ...c, name: decodeEntities(c.name) } : null;
}

export async function getRelatedProducts(productId: number, perPage = 3) {
  const products = await wooGet<StoreProduct[]>('/products', {
    related: productId,
    per_page: perPage,
  } as Record<string, string | number | undefined>);
  return products.map(decodeProduct);
}

interface WpPostRaw {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content?: { rendered: string };
  _embedded?: { 'wp:featuredmedia'?: { source_url: string }[] };
}

function toPost(p: WpPostRaw, withContent: boolean): WpPost {
  return {
    id: p.id,
    slug: p.slug,
    title: decodeEntities(p.title.rendered),
    excerpt: p.excerpt.rendered,
    content: withContent && p.content ? p.content.rendered : '',
    date: p.date,
    image: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? null,
  };
}

export async function getPosts(perPage = 9): Promise<WpPost[]> {
  // NOTE: `_fields` is intentionally not used here — WordPress skips `_embed`
  // when `_fields` is present, which broke featured images.
  const posts = await wpGet<WpPostRaw[]>('/posts', {
    per_page: perPage,
    _embed: 'wp:featuredmedia',
  });
  return posts.map((p) => toPost(p, false));
}

export async function getPostBySlug(slug: string): Promise<WpPost | null> {
  const posts = await wpGet<WpPostRaw[]>('/posts', {
    slug,
    _embed: 'wp:featuredmedia',
  });
  return posts[0] ? toPost(posts[0], true) : null;
}

export async function getWpPage(slug: string): Promise<WpPage | null> {
  const pages = await wpGet<{ title: { rendered: string }; content: { rendered: string } }[]>('/pages', {
    slug,
    _fields: 'title,content',
  });
  if (!pages[0]) return null;
  return { title: decodeEntities(pages[0].title.rendered), content: pages[0].content.rendered };
}

/* ---------------- Catalog (filterable product listing) ---------------- */

export interface CatalogAttributeTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface CatalogAttribute {
  id: number;
  name: string;
  taxonomy: string; // e.g. 'pa_brand', 'pa_gender'
  terms: CatalogAttributeTerm[];
}

export interface CatalogFilters {
  categoryIds: number[];
  search?: string; // Store API full-text search
  minPrice?: number; // minor units (cents)
  maxPrice?: number; // minor units (cents)
  rating?: number; // minimum average rating, 1-5
  attributes: { taxonomy: string; termIds: number[] }[];
  onSale?: boolean;
  inStock?: boolean;
  orderby: 'menu_order' | 'popularity' | 'rating' | 'date' | 'price';
  order?: 'asc' | 'desc'; // sort direction; only price exposes both directions in the UI
  page: number;
  perPage: number;
}

export interface CatalogResult {
  products: StoreProduct[];
  total: number;
  totalPages: number;
}

async function wooGetPaged<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<{ data: T; total: number; totalPages: number }> {
  const res = await fetch(apiUrl(`/wp-json/wc/store/v1${path}`, params), {
    headers: { Accept: 'application/json' },
    next: { revalidate: 300 }, // catalog pages revalidate every 5 minutes
  });
  if (!res.ok) {
    throw new Error(`Woo Store API ${path} failed: ${res.status}`);
  }
  return {
    data: (await res.json()) as T,
    total: parseInt(res.headers.get('X-WP-Total') ?? '0', 10) || 0,
    totalPages: parseInt(res.headers.get('X-WP-TotalPages') ?? '0', 10) || 0,
  };
}

export async function getCatalogProducts(f: CatalogFilters): Promise<CatalogResult> {
  const params: Record<string, string | number | undefined> = {
    per_page: f.perPage,
    page: f.page,
  };
  params.orderby = f.orderby;
  if (f.order) params.order = f.order;
  if (f.categoryIds.length) params.category = f.categoryIds.join(',');
  if (f.search) params.search = f.search;
  // Listings never show unpriced ($0) products: floor min_price at 1 minor
  // unit, merged with any user-selected minimum.
  params.min_price = f.minPrice !== undefined ? Math.max(f.minPrice, 1) : 1;
  if (f.maxPrice !== undefined) params.max_price = f.maxPrice;
  if (f.rating) params.rating = f.rating;
  if (f.onSale) params.on_sale = 'true';
  if (f.inStock) params.stock_status = 'instock';
  // The Store API accepts a single attribute filter per request — send the
  // first and intersect any further selections in memory below.
  const [firstAttr, ...restAttrs] = f.attributes;
  if (firstAttr) {
    params.attribute = firstAttr.taxonomy;
    params.attribute_term = firstAttr.termIds.join(',');
  }
  const { data, total, totalPages } = await wooGetPaged<StoreProduct[]>('/products', params);
  let products = data.map(decodeProduct);
  for (const attr of restAttrs) {
    const ids = new Set(attr.termIds);
    products = products.filter((p) =>
      (p.attributes ?? []).some(
        (a) => a.taxonomy === attr.taxonomy && a.terms.some((t) => ids.has(t.id))
      )
    );
  }
  return { products, total, totalPages };
}

/** All product attributes that actually have terms (e.g. Brand, Gender). */
export async function getProductAttributes(): Promise<CatalogAttribute[]> {
  const attrs = await wooGet<{ id: number; name: string; taxonomy: string }[]>('/products/attributes');
  const out: CatalogAttribute[] = [];
  for (const a of attrs) {
    const terms = await wooGet<CatalogAttributeTerm[]>(`/products/attributes/${a.id}/terms`, {
      per_page: 100,
    });
    if (!terms.length) continue;
    out.push({
      id: a.id,
      name: decodeEntities(a.name),
      taxonomy: a.taxonomy,
      terms: terms.map((t) => ({ ...t, name: decodeEntities(t.name) })),
    });
  }
  return out;
}
