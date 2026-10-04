import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import { productJsonLd, siteUrl } from '@/lib/seo';
import ProductView from '@/components/ProductView';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  const description = stripHtml(product.short_description || product.description).slice(0, 160);
  const image = product.images[0]?.src;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      type: 'website',
      ...(image ? { images: [{ url: image, alt: product.images[0]?.alt || product.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id).catch(() => []);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <ProductView product={product} related={related} />
    </>
  );
}
