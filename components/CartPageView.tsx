'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MDBContainer, MDBRow, MDBCol, MDBBtn, MDBIcon, MDBSpinner } from 'mdb-react-ui-kit';
import { useCart } from './cart/CartProvider';
import { formatPrice } from '@/lib/format';
import styles from './CartPageView.module.css';

/** Headless slug from a Store API permalink (same derivation as the drawer). */
function slugFromPermalink(permalink?: string): string | null {
  const slug = permalink?.split('?')[0].split('#')[0].split('/').filter(Boolean).pop();
  return slug || null;
}

export default function CartPageView() {
  const { cart, loading, busy, updateQuantity, removeItem } = useCart();

  return (
    <MDBContainer className={styles.page}>
      <h1 className={styles.title}>Shopping Bag</h1>
      <p className={styles.sub}>
        {cart && cart.items_count > 0
          ? `${cart.items_count} ${cart.items_count === 1 ? 'item' : 'items'}`
          : 'Your handpicked pieces, in one place.'}
      </p>

      {loading && !cart ? (
        <div className="py-5">
          <div className="skel mb-3" style={{ height: 96 }} />
          <div className="skel mb-3" style={{ height: 96 }} />
          <div className="skel" style={{ height: 96, width: '60%' }} />
        </div>
      ) : !cart || cart.items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <MDBIcon fas icon="bag-shopping" />
          </div>
          <p className="mb-4">Your bag is empty.</p>
          <Link href="/" passHref legacyBehavior>
            <MDBBtn tag="a" className="btn-gold">
              Continue shopping
            </MDBBtn>
          </Link>
        </div>
      ) : (
        <MDBRow>
          <MDBCol md="8">
            {cart.items.map((item) => {
              const slug = slugFromPermalink(item.permalink);
              const img = item.images[0];
              return (
                <div className={styles.line} key={item.key}>
                  {img && (
                    <Image
                      src={img.thumbnail}
                      alt={img.alt || item.name}
                      width={84}
                      height={96}
                      className={styles.thumb}
                    />
                  )}
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between gap-2">
                      {slug ? (
                        <Link href={`/products/${slug}`} className={styles.itemName}>
                          {item.name}
                        </Link>
                      ) : (
                        <strong className={styles.itemName}>{item.name}</strong>
                      )}
                      <button
                        type="button"
                        className={`btn btn-link ${styles.removeBtn}`}
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(item.key)}>
                        <MDBIcon fas icon="trash-can" />
                      </button>
                    </div>
                    <div className={styles.unitPrice}>
                      {formatPrice(
                        item.prices.price,
                        item.prices.currency_minor_unit,
                        item.prices.currency_symbol
                      )}{' '}
                      each
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="qty-stepper">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={busy}
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}>
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={busy}
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}>
                          +
                        </button>
                      </div>
                      <span className={styles.lineTotal}>
                        {formatPrice(
                          item.totals.line_total,
                          item.prices.currency_minor_unit,
                          item.prices.currency_symbol
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {busy && (
              <div className="text-center my-3">
                <MDBSpinner size="sm" role="status" />
              </div>
            )}
          </MDBCol>
          <MDBCol md="4">
            <div className={`${styles.summary} mt-4 mt-md-0`}>
              <div className={styles.sumRow}>
                <dt>Subtotal</dt>
                <dd>
                  {formatPrice(
                    cart.totals.total_price,
                    cart.totals.currency_minor_unit,
                    cart.totals.currency_symbol
                  )}
                </dd>
              </div>
              <p className={styles.hint}>Shipping &amp; taxes calculated at checkout.</p>
              <Link href="/checkout" passHref legacyBehavior>
                <MDBBtn tag="a" className="btn-gold d-block text-center">
                  Proceed to checkout
                </MDBBtn>
              </Link>
              <Link href="/" className="btn btn-link w-100 mt-2" style={{ fontWeight: 300 }}>
                Continue shopping
              </Link>
            </div>
          </MDBCol>
        </MDBRow>
      )}
    </MDBContainer>
  );
}
