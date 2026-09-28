import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import ProductView from '@/components/ProductView';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: stripHtml(product.short_description || product.description).slice(0, 160),
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug).catch(() => null);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id).catch(() => []);
  return <ProductView product={product} related={related} />;
}
