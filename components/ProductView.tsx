'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBBreadcrumb,
  MDBBreadcrumbItem,
  MDBBadge,
  MDBIcon,
  MDBAccordion,
  MDBAccordionItem,
  MDBTable,
  MDBTableBody,
} from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import { isSellable } from '@/lib/woo';
import { formatPrice } from '@/lib/format';
import TrackViewItem from './TrackViewItem';
import ProductCard from './ProductCard';
import AddToCartButton from './AddToCartButton';
import RatingStars from './RatingStars';
import styles from './ProductView.module.css';

function Gallery({ images, name }: { images: StoreProduct['images']; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  if (!current) {
    return (
      <div className={`${styles.gallery} d-flex align-items-center justify-content-center`} style={{ minHeight: 400 }}>
        <MDBIcon fas icon="image" size="3x" className="text-muted" />
      </div>
    );
  }
  return (
    <div className={styles.gallery}>
      <div className={`${styles.main} mb-3`}>
        <Image
          src={current.src}
          alt={current.alt || name}
          width={800}
          height={800}
          priority
          sizes="(max-width: 768px) 100vw, 600px"
        />
      </div>
      {images.length > 1 && (
        <div className="d-flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`${styles.thumb}${i === active ? ` ${styles.active}` : ''}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
            >
              <img src={img.thumbnail || img.src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductView({
  product,
  related,
}: {
  product: StoreProduct;
  related: StoreProduct[];
}) {
  const { prices } = product;
  const [qty, setQty] = useState(1);
  const isVariable = product.type === 'variable' && (product.variations?.length ?? 0) > 0;
  // Group variations by attribute name -> unique values
  const variationAttrs = (() => {
    const map = new Map<string, Set<string>>();
    for (const v of product.variations ?? []) {
      const attrs = v.attributes as unknown as { name: string; value: string }[] | Record<string, string>;
      const entries = Array.isArray(attrs)
        ? attrs.map(a => [a.name, a.value] as const)
        : Object.entries(attrs);
      for (const [name, value] of entries) {
        if (!map.has(name)) map.set(name, new Set());
        if (value) map.get(name)!.add(value);
      }
    }
    return [...map.entries()].map(([name, values]) => ({ name, values: [...values] }));
  })();
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});
  // Find matching variation ID
  const selectedVariationId = (() => {
    if (!isVariable) return undefined;
    if (Object.keys(selectedAttrs).length < variationAttrs.length) return undefined;
    for (const v of product.variations ?? []) {
      const attrs = v.attributes as unknown as { name: string; value: string }[] | Record<string, string>;
      const entries = Array.isArray(attrs)
        ? attrs.map(a => [a.name, a.value] as const)
        : Object.entries(attrs);
      if (entries.every(([name, value]) => selectedAttrs[name] === value)) return v.id;
    }
    return undefined;
  })();
  const rating = parseFloat(product.average_rating || '0');
  const purchasable = isSellable(product);
  const discount =
    product.on_sale &&
    parseInt(prices.regular_price || '0', 10) > parseInt(prices.sale_price || '0', 10)
      ? Math.round(
          (1 - parseInt(prices.sale_price, 10) / parseInt(prices.regular_price, 10)) * 100
        )
      : null;

  return (
    <MDBContainer className={`py-5 ${styles.pdp}`}>
      <TrackViewItem product={product} />
      <MDBBreadcrumb className="mb-4">
        <MDBBreadcrumbItem>
          <Link href="/">Home</Link>
        </MDBBreadcrumbItem>
        {product.categories[0] && (
          <MDBBreadcrumbItem>
            <Link href={`/catalog?category=${product.categories[0].slug}`}>{product.categories[0].name}</Link>
          </MDBBreadcrumbItem>
        )}
        <MDBBreadcrumbItem active>{product.name}</MDBBreadcrumbItem>
      </MDBBreadcrumb>

      <MDBRow className="mb-5">
        <MDBCol lg="6" className="mb-4">
          <Gallery images={product.images} name={product.name} />
        </MDBCol>
        <MDBCol lg="6">
          {product.categories[0] && (
            <p className="kicker mb-2">{product.categories[0].name}</p>
          )}
          <h1 className={`${styles.title} mb-3`}>{product.name}</h1>

          <div className="mb-3 d-flex align-items-center gap-2">
            <RatingStars rating={rating} />
            {rating > 0 && (
              <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                {rating.toFixed(1)} · {product.review_count} review{product.review_count === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="my-4 d-flex align-items-center gap-3">
            {product.on_sale ? (
              <>
                <span className="price-regular fs-5">
                  {formatPrice(prices.regular_price, prices.currency_minor_unit, prices.currency_symbol)}
                </span>
                <span style={{ fontSize: '2.2rem', fontFamily: 'var(--font-price)', fontWeight: 100 }}>
                  {formatPrice(prices.sale_price, prices.currency_minor_unit, prices.currency_symbol)}
                </span>
                {discount !== null && (
                  <MDBBadge className="product-badge badge-sale" style={{ position: 'static' }}>
                    Save {discount}%
                  </MDBBadge>
                )}
              </>
            ) : (
              <span style={{ fontSize: '2.2rem', fontFamily: 'var(--font-price)', fontWeight: 100 }}>
                {formatPrice(prices.price, prices.currency_minor_unit, prices.currency_symbol)}
              </span>
            )}
          </div>

          <div className="mb-4 d-flex align-items-center gap-3">
            {product.is_in_stock ? (
              <span style={{ color: '#7fb08a', fontSize: '0.9rem' }}>
                <MDBIcon fas icon="check" className="me-2" />
                {product.stock_availability.text || 'In stock'}
              </span>
            ) : (
              <MDBBadge color="danger" pill light>
                Out of stock
              </MDBBadge>
            )}
            {product.sku && (
              <span className="text-muted small">SKU: {product.sku}</span>
            )}
          </div>

          {product.short_description && (
            <div
              className="prose-wp mb-4"
              dangerouslySetInnerHTML={{ __html: product.short_description }}
            />
          )}

          {isVariable && variationAttrs.length > 0 && (
            <div className="mb-4">
              {variationAttrs.map(attr => (
                <div key={attr.name} className="mb-3">
                  <label className="form-label fw-bold">{attr.name}: {selectedAttrs[attr.name] || 'Select...'}</label>
                  <div className="d-flex flex-wrap gap-2">
                    {attr.values.map(value => (
                      <button
                        key={value}
                        type="button"
                        className={`btn ${selectedAttrs[attr.name] === value ? 'btn-primary' : 'btn-outline-secondary'} btn-sm`}
                        onClick={() => setSelectedAttrs(prev => ({ ...prev, [attr.name]: value }))}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="d-flex gap-3 mb-4 align-items-stretch flex-wrap">
            <div className={styles.qtyStepper}>
              <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))}>
                +
              </button>
            </div>
            <AddToCartButton
              productId={product.id}
              variationId={selectedVariationId}
              quantity={qty}
              disabled={!purchasable || (isVariable && !selectedVariationId)}
              className="btn-gold flex-grow-1"
            >
              <MDBIcon fas icon="bag-shopping" className="me-2" />
              {!purchasable ? 'Out of stock' : isVariable && !selectedVariationId ? 'Select options' : 'Add to bag'}
            </AddToCartButton>
          </div>

          <div className="mb-4">
            <div className={styles.perkRow}>
              <MDBIcon fas icon="truck-fast" /> Complimentary shipping on orders over $50
            </div>
            <div className={styles.perkRow}>
              <MDBIcon fas icon="rotate-left" /> 15-day returns on eligible items
            </div>
            <div className={styles.perkRow} style={{ borderBottom: '1px solid var(--line)' }}>
              <MDBIcon fas icon="shield-halved" /> 100% authentic - sourced from trusted brands
            </div>
          </div>

          <MDBAccordion>
            {product.description && (
              <MDBAccordionItem collapseId={1} headerTitle="Description">
                <div className="prose-wp" dangerouslySetInnerHTML={{ __html: product.description }} />
              </MDBAccordionItem>
            )}
            {product.attributes.length > 0 && (
              <MDBAccordionItem collapseId={2} headerTitle="Details">
                <MDBTable>
                  <MDBTableBody>
                    {product.attributes.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-bold" style={{ width: '40%' }}>{a.name}</td>
                        <td>{a.terms.map((t) => t.name).join(', ')}</td>
                      </tr>
                    ))}
                  </MDBTableBody>
                </MDBTable>
              </MDBAccordionItem>
            )}
            <MDBAccordionItem collapseId={3} headerTitle="Shipping & Returns">
              <div className="prose-wp">
                <p>
                  Orders ship within 1–2 business days. Complimentary shipping on orders over
                  $50. If an item arrives damaged or incorrect, contact us within 15 days at{' '}
                  <a href="mailto:service@indemos.com">service@indemos.com</a>. See our{' '}
                  <Link href="/refunds-and-returns">Refunds and Returns</Link> page for the full policy.
                </p>
              </div>
            </MDBAccordionItem>
          </MDBAccordion>
        </MDBCol>
      </MDBRow>

      {related.length > 0 && (
        <section className="mt-5">
          <div className="text-center mb-4">
            <p className="kicker mb-2">Pairs well with</p>
            <h2 className="section-title">You may also like</h2>
            <div className="divider-gold" />
          </div>
          <MDBRow>
            {related.map((p) => (
              <MDBCol md="4" sm="6" className="mb-4" key={p.id}>
                <ProductCard product={p} />
              </MDBCol>
            ))}
          </MDBRow>
        </section>
      )}
    </MDBContainer>
  );
}
