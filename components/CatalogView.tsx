'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import type { CatalogAttribute, StoreCategory, StoreProduct } from '@/lib/woo';
import type { SortOption } from '@/app/catalog/page';
import ProductCard from '@/components/ProductCard';
import CatalogFilters from '@/components/CatalogFilters';
import CatalogToolbar from '@/components/CatalogToolbar';
import CatalogPagination from '@/components/CatalogPagination';
import PageHero from '@/components/PageHero';
import styles from './Catalog.module.css';

export interface ActiveChip {
  label: string;
  href: string;
}

interface Props {
  products: StoreProduct[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
  perPageOptions: number[];
  sortKey: string;
  sortOptions: SortOption[];
  from: number;
  to: number;
  params: Record<string, string>;
  categories: StoreCategory[];
  topCats: StoreCategory[];
  attributes: CatalogAttribute[];
  chips: ActiveChip[];
  search: string | null;
  selectedCategoryIds: number[];
  minPrice: number | null;
  maxPrice: number | null;
  rating: number | null;
  onSale: boolean;
  inStock: boolean;
}

export default function CatalogView(props: Props) {
  const {
    products,
    total,
    totalPages,
    page,
    perPage,
    perPageOptions,
    sortKey,
    sortOptions,
    from,
    to,
    params,
    categories,
    topCats,
    attributes,
    chips,
    search,
    selectedCategoryIds,
    minPrice,
    maxPrice,
    rating,
    onSale,
    inStock,
  } = props;

  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Catalog' },
        ]}
        title="Our Catalog"
        caption="Every piece, in one place - filter by what matters to you."
      />

      <MDBContainer className={styles.wrap}>
        <div className={styles.layout}>
          <CatalogFilters
            params={params}
            categories={categories}
            attributes={attributes}
            selectedCategoryIds={selectedCategoryIds}
            minPrice={minPrice}
            maxPrice={maxPrice}
            rating={rating}
            onSale={onSale}
            inStock={inStock}
          />

          <div className={styles.main}>
            <CatalogToolbar
              params={params}
              total={total}
              from={from}
              to={to}
              perPage={perPage}
              perPageOptions={perPageOptions}
              sortKey={sortKey}
              sortOptions={sortOptions}
              search={search}
            />

            {chips.length > 0 && (
              <div className={styles.activeChips}>
                {chips.map((chip) => (
                  <Link key={chip.label} href={chip.href} className={styles.activeChip}>
                    {chip.label}
                    <MDBIcon fas icon="xmark" className="ms-2" />
                  </Link>
                ))}
                <Link href="/catalog" className={styles.clearAll}>
                  Clear all
                </Link>
              </div>
            )}

            {products.length === 0 ? (
              <div className={styles.empty}>
                <MDBIcon fas icon="magnifying-glass" size="2x" className="mb-3" style={{ color: 'var(--faint)' }} />
                <p className="mb-3">No products match these filters.</p>
                <Link href="/catalog" className="btn btn-outline-light">
                  Clear all filters
                </Link>
              </div>
            ) : (
              <MDBRow>
                {products.map((p) => (
                  <MDBCol md="4" sm="6" className="mb-4" key={p.id}>
                    <ProductCard product={p} />
                  </MDBCol>
                ))}
              </MDBRow>
            )}

            <CatalogPagination page={page} totalPages={totalPages} params={params} />
          </div>
        </div>
      </MDBContainer>
    </>
  );
}
