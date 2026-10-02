import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getProductsPaged } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import CategoryView from '@/components/CategoryView';

export const revalidate = 3600;

const PER_PAGE = 12;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug).catch(() => null);
  if (!category) return { title: 'Category not found' };
  return {
    title: category.name,
    description: stripHtml(category.description).slice(0, 160) || `${category.name} — Indemos`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const category = await getCategoryBySlug(params.slug).catch(() => null);
  if (!category) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const { products, totalPages } = await getProductsPaged({ category: category.id, per_page: PER_PAGE, page }).catch(
    () => ({ products: [], totalPages: 0 })
  );

  return <CategoryView category={category} products={products} page={page} totalPages={totalPages} />;
}
