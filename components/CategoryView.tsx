'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBBreadcrumb, MDBBreadcrumbItem } from 'mdb-react-ui-kit';
import type { StoreProduct, StoreCategory } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import ProductCard from './ProductCard';
import CatalogPagination from './CatalogPagination';

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
      <div className="info-hero">
        <MDBContainer className="py-5">
          <MDBBreadcrumb className="mb-3">
            <MDBBreadcrumbItem>
              <Link href="/">Home</Link>
            </MDBBreadcrumbItem>
            <MDBBreadcrumbItem active>{category.name}</MDBBreadcrumbItem>
          </MDBBreadcrumb>
          <p className="kicker mb-2">The collection</p>
          <h1 className="font-serif mb-2" style={{ fontSize: '3rem' }}>{category.name}</h1>
          {description && (
            <p className="mb-1" style={{ color: 'var(--muted)', maxWidth: 640 }}>{description}</p>
          )}
          <p className="small mb-0" style={{ color: 'var(--muted)' }}>
            {category.count} product{category.count === 1 ? '' : 's'}
          </p>
        </MDBContainer>
      </div>

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
