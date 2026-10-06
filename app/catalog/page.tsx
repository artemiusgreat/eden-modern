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
import { stripHtml } from '@/lib/format';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  // getCategories() is React-cached: this shares the page's own fetch,
  // so resolving the category name/description costs zero extra API calls.
  const sp = await searchParams;
  const categories = await getCategories().catch(() => []);
  const catParam = (first(sp.category) ?? '').split(',').map((s) => s.trim()).filter(Boolean);

  let title = 'Catalog';
  let description = 'Browse the full catalog — filter by category, price, rating and more.';
  if (catParam.length === 1) {
    const raw = catParam[0];
    const asNum = parseInt(raw, 10);
    const cat =
      (asNum > 0 && categories.find((c) => c.id === asNum)) ||
      categories.find((c) => c.slug.toLowerCase() === raw.toLowerCase());
    if (cat) {
      title = `${cat.name} | Catalog`;
      const catDesc = stripHtml(cat.description || '').slice(0, 160);
      if (catDesc) description = catDesc;
    }
  } else if (first(sp.search)) {
    title = `Search: ${first(sp.search)} | Catalog`;
  } else if (first(sp.on_sale) === '1') {
    title = 'Sale | Catalog';
  }

  // Canonical: keep filters, drop page=1 (page 2+ self-canonicalizes).
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(flatParams(sp))) {
    if (k === 'page' && v === '1') continue;
    params.set(k, v);
  }
  const qs = params.toString();
  return {
    title,
    description,
    alternates: { canonical: qs ? `/catalog?${qs}` : '/catalog' },
  };
}

const ORDERBYS = ['featured', 'popularity', 'rating', 'date', 'price'] as const;
type OrderbyKey = (typeof ORDERBYS)[number];
const ORDERS = ['asc', 'desc'] as const;
type OrderDir = (typeof ORDERS)[number];

/** Sort dropdown options: each maps to an ?orderby= + optional ?order= pair. */
export interface SortOption {
  key: string;
  label: string;
  orderby: OrderbyKey;
  order?: OrderDir;
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'featured', label: 'Featured', orderby: 'featured' },
  { key: 'popularity', label: 'Popularity', orderby: 'popularity' },
  { key: 'rating', label: 'Average rating', orderby: 'rating' },
  { key: 'date', label: 'Newest', orderby: 'date' },
  { key: 'price-asc', label: 'Price: low to high', orderby: 'price', order: 'asc' },
  { key: 'price-desc', label: 'Price: high to low', orderby: 'price', order: 'desc' },
];

const ORDERBY_API: Record<OrderbyKey, CatalogQuery['orderby']> = {
  featured: 'menu_order',
  popularity: 'popularity',
  rating: 'rating',
  date: 'date',
  price: 'price',
};

const PER_PAGE_OPTIONS = [12, 24, 36];

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

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

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const flat = flatParams(sp);
  const [categories, attributes] = await Promise.all([getCategories(), getProductAttributes()]);
  const catById = new Map<number, StoreCategory>(categories.map((c) => [c.id, c]));
  const catBySlug = new Map<string, StoreCategory>(
    categories.map((c) => [c.slug.toLowerCase(), c])
  );

  // ---- Parse URL filters ----
  // ?category= accepts numeric IDs and slugs (e.g. ?category=perfumes-colognes).
  const categoryIds: number[] = [];
  for (const raw of (first(sp.category) ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const asNum = parseInt(raw, 10);
    if (asNum > 0 && catById.has(asNum)) {
      categoryIds.push(asNum);
    } else {
      const cat = catBySlug.get(raw.toLowerCase());
      if (cat) categoryIds.push(cat.id);
    }
  }
  const minDollars = parseFloat(first(sp.min_price) ?? '');
  const maxDollars = parseFloat(first(sp.max_price) ?? '');
  const ratingRaw = parseInt(first(sp.rating) ?? '', 10);
  // ?orderby= + ?order= are separate params. ?order= is only honored for
  // price (the only sort with two directions); legacy ?orderby=price-desc
  // URLs (bookmarks, indexed) map to orderby=price&order=desc.
  const rawOrderby = first(sp.orderby) ?? '';
  const legacyDesc = rawOrderby === 'price-desc';
  const orderbyKey: OrderbyKey = legacyDesc
    ? 'price'
    : (ORDERBYS as readonly string[]).includes(rawOrderby)
      ? (rawOrderby as OrderbyKey)
      : 'featured';
  const rawOrder = first(sp.order) ?? '';
  const orderDir: OrderDir | undefined =
    orderbyKey !== 'price'
      ? undefined
      : (ORDERS as readonly string[]).includes(rawOrder)
        ? (rawOrder as OrderDir)
        : legacyDesc
          ? 'desc'
          : 'asc';
  const sortKey =
    SORT_OPTIONS.find((o) => o.orderby === orderbyKey && (o.order ?? undefined) === orderDir)
      ?.key ?? 'featured';
  const perPageRaw = parseInt(first(sp.per_page) ?? '', 10);
  const perPage = PER_PAGE_OPTIONS.includes(perPageRaw) ? perPageRaw : 12;
  const page = Math.max(1, parseInt(first(sp.page) ?? '', 10) || 1);
  const search = (first(sp.search) ?? '').trim();

  // Attribute filters: ?pa_brand=slug1,slug2 — resolved slug -> term id.
  const attrFilters: { taxonomy: string; name: string; termIds: number[]; terms: { slug: string; name: string }[] }[] = [];
  for (const attr of attributes) {
    const slugs = (first(sp[attr.taxonomy]) ?? '')
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
    onSale: first(sp.on_sale) === '1',
    inStock: first(sp.in_stock) === '1',
    orderby: ORDERBY_API[orderbyKey],
    order: orderDir,
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
        sortKey={sortKey}
        sortOptions={SORT_OPTIONS}
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
