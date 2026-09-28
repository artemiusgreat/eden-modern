import { getProducts } from '@/lib/woo';
import SearchView from '@/components/SearchView';

export const revalidate = 3600;

const PER_PAGE = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; on_sale?: string };
}) {
  const q = searchParams.q ?? '';
  const onSale = searchParams.on_sale === '1';
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const products = await getProducts({
    search: q || undefined,
    on_sale: onSale || undefined,
    per_page: PER_PAGE,
    page,
  }).catch(() => []);

  return <SearchView q={q} onSale={onSale} products={products} page={page} />;
}
