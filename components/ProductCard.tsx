'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import { formatPrice } from '@/lib/format';
import AddToCartButton from './AddToCartButton';
import RatingStars from './RatingStars';
import styles from './ProductCard.module.css';
import btnStyles from './AddToCartButton.module.css';

function discountPct(p: StoreProduct): number | null {
  const reg = parseInt(p.prices.regular_price || '0', 10);
  const sale = parseInt(p.prices.sale_price || '0', 10);
  if (p.on_sale && reg > 0 && sale > 0 && sale < reg) {
    return Math.round((1 - sale / reg) * 100);
  }
  return null;
}

export default function ProductCard({ product, badge }: { product: StoreProduct; badge?: 'new' | 'bestseller' }) {
  const img = product.images[0];
  const { prices } = product;
  const rating = parseFloat(product.average_rating || '0');
  const pct = discountPct(product);
  const purchasable = product.is_purchasable && product.is_in_stock;

  return (
    <MDBCard className={`h-100 ${styles.card}`}>
      <div className={styles.media}>
        <Link href={`/products/${product.slug}`} aria-label={product.name} className="position-relative">
          {pct !== null ? (
            <span className="product-badge badge-sale">-{pct}%</span>
          ) : badge === 'new' ? (
            <span className="product-badge badge-new">New</span>
          ) : badge === 'bestseller' ? (
            <span className="product-badge badge-new">Best seller</span>
          ) : null}
          {img ? (
            <Image
              src={img.src}
              alt={img.alt || product.name}
              width={500}
              height={625}
              loading="lazy"
              sizes="(max-width: 768px) 50vw, 360px"
            />
          ) : (
            <span style={{ color: 'var(--faint)' }}>
              <MDBIcon fas icon="image" size="3x" />
            </span>
          )}
        </Link>
      </div>
      <MDBCardBody className={`${styles.cardBody} p-3`}>
        <h3 className={styles.name}>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className={styles.buyRow}>
          <div className="d-flex align-items-baseline gap-2">
            {product.on_sale ? (
              <>
                <span className="price-regular">
                  {formatPrice(prices.regular_price, prices.currency_minor_unit, prices.currency_symbol)}
                </span>
                <span className="price-sale">
                  {formatPrice(prices.sale_price, prices.currency_minor_unit, prices.currency_symbol)}
                </span>
              </>
            ) : (
              <span className="price-now">
                {formatPrice(prices.price, prices.currency_minor_unit, prices.currency_symbol)}
              </span>
            )}
          </div>
          <AddToCartButton
            productId={product.id}
            disabled={!purchasable}
            className={btnStyles.cartBtn}
            ariaLabel={purchasable ? `Add ${product.name} to bag` : 'Out of stock'}
          >
            <MDBIcon fas icon="cart-shopping" />
            <span className={styles.cartLabel}>Add to Bag</span>
          </AddToCartButton>
        </div>
      </MDBCardBody>
    </MDBCard>
  );
}
