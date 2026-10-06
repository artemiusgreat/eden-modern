'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBBreadcrumb, MDBBreadcrumbItem } from 'mdb-react-ui-kit';
import type { StoreProduct, StoreCategory } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import ProductCard from './ProductCard';
import CatalogPagination from './CatalogPagination';
import PageHero from './PageHero';

export default function CategoryView({
  category,
  products,
  page,
  totalPages,
}: {
  category: StoreCategory;
  products: StoreProduct[];
  page: number;
  totalPages: number;
}) {
  const description = stripHtml(category.description || '').slice(0, 220);

  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: category.name },
        ]}
        title={category.name}
        caption={
          <>
            {description ? <span className="d-block mb-2">{description}</span> : null}
            <span>
              {category.count} product{category.count === 1 ? '' : 's'}
            </span>
          </>
        }
      />

      <MDBContainer className="py-5">
        {products.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No products in this category yet.</p>
        ) : (
          <>
            <MDBRow>
              {products.map((p) => (
                <MDBCol md="4" sm="6" className="mb-4" key={p.id}>
                  <ProductCard product={p} />
                </MDBCol>
              ))}
            </MDBRow>
            <CatalogPagination
              page={page}
              totalPages={totalPages}
              params={{}}
              basePath={`/product-category/${category.slug}`}
            />
          </>
        )}
      </MDBContainer>
    </>
  );
}
