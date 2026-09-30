'use client';

import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import ProductCard from './ProductCard';
import Pagination from './Pagination';

export default function SearchView({
  q,
  onSale,
  products,
  page,
}: {
  q: string;
  onSale?: boolean;
  products: StoreProduct[];
  page: number;
}) {
  const title = onSale ? 'The Private Sale' : q ? `Results for “${q}”` : 'All products';

  return (
    <MDBContainer className="py-5">
      {onSale && <p className="kicker mb-2">Limited time</p>}
      <h1 className="font-serif mb-2" style={{ fontSize: '2.6rem' }}>{title}</h1>
      <p className="mb-4" style={{ color: 'var(--muted)' }}>
        {products.length} {products.length === 1 ? 'product' : 'products'}
      </p>

      {products.length === 0 ? (
        <div className="text-center py-5">
          <MDBIcon fas icon="magnifying-glass" size="3x" className="mb-3" style={{ color: 'var(--gold-soft)' }} />
          <p style={{ color: 'var(--muted)' }}>No products found. Try a different search term.</p>
        </div>
      ) : (
        <>
          <MDBRow>
            {products.map((p) => (
              <MDBCol md="4" sm="6" className="mb-4" key={p.id}>
                <ProductCard product={p} />
              </MDBCol>
            ))}
          </MDBRow>
          <Pagination page={page} basePath="/search" query={{ q, on_sale: onSale ? '1' : undefined }} />
        </>
      )}
    </MDBContainer>
  );
}
