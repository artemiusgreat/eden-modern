import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import {
  getCatalogProducts,
  getCategories,
  getProductAttributes,
  type CatalogFilters as CatalogQuery,
  type StoreCategory,
} from '@/lib/woo';
import CatalogView, { type ActiveChip } from '@/components/CatalogView';

export const metadata: Metadata = {
  title: 'Catalog',
  description: 'Browse the full catalog — filter by category, price, rating and more.',
};

const ORDERBYS = ['featured', 'popularity', 'rating', 'date', 'price', 'price-desc'] as const;
type OrderbyKey = (typeof ORDERBYS)[number];

const ORDERBY_LABEL: Record<OrderbyKey, string> = {
  featured: 'Featured',
  popularity: 'Popularity',
  rating: 'Average rating',
  date: 'Newest',
  price: 'Price: low to high',
  'price-desc': 'Price: high to low',
};

const ORDERBY_API: Record<OrderbyKey, CatalogQuery['orderby']> = {
  featured: 'menu_order',
  popularity: 'popularity',
  rating: 'rating',
  date: 'date',
  price: 'price',
  'price-desc': 'price-desc',
};

const PER_PAGE_OPTIONS = [12, 24, 36];

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const numList = (v: string | undefined): number[] =>
  (v ?? '')
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => n > 0);

/** Flatten Next's searchParams for URL building + client components. */
function flatParams(sp: SP): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const f = first(v);
    if (f !== undefined && f !== '') out[k] = f;
  }
  return out;
}

function catalogUrl(flat: Record<string, string>): string {
  const s = new URLSearchParams(flat).toString();
  return s ? `/catalog?${s}` : '/catalog';
}

/** URL with one filter removed (single value from a comma list, or whole key). */
function withoutFilter(flat: Record<string, string>, key: string, value?: string): string {
  const p = new URLSearchParams(flat);
  if (value === undefined) {
    p.delete(key);
  } else {
    const vals = (p.get(key) ?? '').split(',').filter((v) => v !== value);
    if (vals.length) p.set(key, vals.join(','));
    else p.delete(key);
  }
  p.delete('page');
  return catalogUrl(Object.fromEntries(p.entries()));
}

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const flat = flatParams(searchParams);
  const [categories, attributes] = await Promise.all([getCategories(), getProductAttributes()]);
  const catById = new Map<number, StoreCategory>(categories.map((c) => [c.id, c]));

  // ---- Parse URL filters ----
  const categoryIds = numList(first(searchParams.category));
  const minDollars = parseFloat(first(searchParams.min_price) ?? '');
  const maxDollars = parseFloat(first(searchParams.max_price) ?? '');
  const ratingRaw = parseInt(first(searchParams.rating) ?? '', 10);
  const orderbyKey: OrderbyKey = (ORDERBYS as readonly string[]).includes(first(searchParams.orderby) ?? '')
    ? (first(searchParams.orderby) as OrderbyKey)
    : 'featured';
  const perPageRaw = parseInt(first(searchParams.per_page) ?? '', 10);
  const perPage = PER_PAGE_OPTIONS.includes(perPageRaw) ? perPageRaw : 12;
  const page = Math.max(1, parseInt(first(searchParams.page) ?? '', 10) || 1);
  const search = (first(searchParams.search) ?? '').trim();

  // Attribute filters: ?pa_brand=slug1,slug2 — resolved slug -> term id.
  const attrFilters: { taxonomy: string; name: string; termIds: number[]; terms: { slug: string; name: string }[] }[] = [];
  for (const attr of attributes) {
    const slugs = (first(searchParams[attr.taxonomy]) ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!slugs.length) continue;
    const terms = attr.terms.filter((t) => slugs.includes(t.slug.toLowerCase()));
    if (terms.length) {
      attrFilters.push({
        taxonomy: attr.taxonomy,
        name: attr.name,
        termIds: terms.map((t) => t.id),
        terms: terms.map((t) => ({ slug: t.slug, name: t.name })),
      });
    }
  }

  const minPrice = Number.isFinite(minDollars) && minDollars >= 0 ? minDollars : null;
  const maxPrice = Number.isFinite(maxDollars) && maxDollars >= 0 ? maxDollars : null;
  const rating = ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  const filters: CatalogQuery = {
    categoryIds,
    search: search || undefined,
    minPrice: minPrice !== null ? Math.round(minPrice * 100) : undefined,
    maxPrice: maxPrice !== null ? Math.round(maxPrice * 100) : undefined,
    rating: rating ?? undefined,
    attributes: attrFilters,
    onSale: first(searchParams.on_sale) === '1',
    inStock: first(searchParams.in_stock) === '1',
    orderby: ORDERBY_API[orderbyKey],
    page,
    perPage,
  };

  const { products, total, totalPages } = await getCatalogProducts(filters);
  if (page > totalPages && totalPages > 0) {
    const p = new URLSearchParams(flat);
    p.set('page', String(totalPages));
    redirect(catalogUrl(Object.fromEntries(p.entries())));
  }

  // ---- Active filter chips ----
  const chips: ActiveChip[] = [];
  if (search) {
    chips.push({ label: `Search: “${search}”`, href: withoutFilter(flat, 'search') });
  }
  for (const id of categoryIds) {
    const c = catById.get(id);
    if (c) chips.push({ label: c.name, href: withoutFilter(flat, 'category', String(id)) });
  }
  if (minPrice !== null || maxPrice !== null) {
    const lo = minPrice !== null ? `$${minPrice.toFixed(0)}` : '$0';
    const hi = maxPrice !== null ? `$${maxPrice.toFixed(0)}` : 'any';
    const p = new URLSearchParams(flat);
    p.delete('min_price');
    p.delete('max_price');
    p.delete('page');
    chips.push({ label: `Price: ${lo} – ${hi}`, href: catalogUrl(Object.fromEntries(p.entries())) });
  }
  if (rating) {
    chips.push({
      label: rating === 5 ? 'Rated 5 stars' : `Rated ${rating}★ & up`,
      href: withoutFilter(flat, 'rating'),
    });
  }
  for (const a of attrFilters) {
    for (const t of a.terms) {
      chips.push({ label: t.name, href: withoutFilter(flat, a.taxonomy, t.slug) });
    }
  }
  if (filters.onSale) chips.push({ label: 'On sale', href: withoutFilter(flat, 'on_sale') });
  if (filters.inStock) chips.push({ label: 'In stock', href: withoutFilter(flat, 'in_stock') });

  const topCats = categories.filter((c) => c.parent === 0);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <Suspense fallback={null}>
      <CatalogView
        products={products}
        total={total}
        totalPages={totalPages}
        page={page}
        perPage={perPage}
        perPageOptions={PER_PAGE_OPTIONS}
        orderby={orderbyKey}
        orderbyLabels={ORDERBY_LABEL}
        from={from}
        to={to}
        params={flat}
        categories={categories}
        topCats={topCats}
        attributes={attributes}
        chips={chips}
        search={search || null}
        selectedCategoryIds={categoryIds}
        minPrice={minPrice}
        maxPrice={maxPrice}
        rating={rating}
        onSale={!!filters.onSale}
        inStock={!!filters.inStock}
      />
    </Suspense>
  );
}
