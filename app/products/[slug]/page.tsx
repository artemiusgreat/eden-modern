import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug, getRelatedProducts } from '@/lib/woo';
import { stripHtml, decodeEntities } from '@/lib/format';
import { productJsonLd, siteUrl } from '@/lib/seo';
import ProductView from '@/components/ProductView';

export const revalidate = 3600;

/** Build a unique, clean meta description for a product page.
 * - Decodes HTML entities (e.g. &#8211; -> –)
 * - Truncates at word boundary (~155 chars), never mid-word
 * - Prefixes product name for uniqueness when supplier descriptions are duplicated
 * - Falls back to name + category when no usable description exists */
function buildMetaDescription(product: { name: string; short_description?: string; description?: string; categories?: { name: string }[] }): string {
  const raw = product.short_description || product.description || '';
  let desc = decodeEntities(stripHtml(raw)).replace(/\s+/g, ' ').trim();

  if (desc.length < 20) {
    const cat = product.categories?.[0]?.name || '';
    desc = `${product.name}${cat ? ` — ${cat}` : ''}. Shop authentic fragrances at competitive prices.`;
  } else {
    // Prefix product name when it's not already in the description (de-dupes supplier copy)
    const nameHead = product.name.split(' ').slice(0, 3).join(' ').toLowerCase();
    if (!desc.toLowerCase().includes(nameHead)) {
      desc = `${product.name}. ${desc}`;
    }
  }

  if (desc.length > 155) {
    const cut = desc.slice(0, 155);
    const lastSpace = cut.lastIndexOf(' ');
    desc = (lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim() + '…';
  }
  return desc;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  const description = buildMetaDescription(product);
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
