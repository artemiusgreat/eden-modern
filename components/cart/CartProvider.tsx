'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MDBBtn, MDBBadge, MDBSpinner, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreCart } from '@/lib/woo';
import { formatPrice } from '@/lib/format';
import styles from './CartDrawer.module.css';

interface CartContextValue {
  cart: StoreCart | null;
  loading: boolean;
  busy: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (id: number, quantity?: number) => Promise<void>;
  updateQuantity: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

async function cartApi(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error('Cart request failed');
  return (await res.json()) as StoreCart;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<StoreCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/cart', { cache: 'no-store' });
      if (res.ok) setCart((await res.json()) as StoreCart);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = useCallback(async (fn: () => Promise<StoreCart>) => {
    setBusy(true);
    try {
      setCart(await fn());
    } finally {
      setBusy(false);
    }
  }, []);

  const addItem = useCallback(
    (id: number, quantity = 1) =>
      mutate(() => cartApi('add', { id, quantity })).then(() => setDrawerOpen(true)),
    [mutate]
  );
  const updateQuantity = useCallback(
    (key: string, quantity: number) =>
      quantity <= 0 ? mutate(() => cartApi('remove', { key })) : mutate(() => cartApi('update', { key, quantity })),
    [mutate]
  );
  const removeItem = useCallback((key: string) => mutate(() => cartApi('remove', { key })), [mutate]);

  const value = useMemo(
    () => ({ cart, loading, busy, drawerOpen, setDrawerOpen, addItem, updateQuantity, removeItem }),
    [cart, loading, busy, drawerOpen, addItem, updateQuantity, removeItem]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

function CartDrawer() {
  const { cart, busy, drawerOpen, setDrawerOpen, updateQuantity, removeItem } = useCart();

  return (
    <>
      <div
        className={`${styles.backdrop}${drawerOpen ? ` ${styles.show}` : ''}`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside className={`${styles.drawer}${drawerOpen ? ` ${styles.show}` : ''}`} aria-hidden={!drawerOpen}>
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom">
          <h5 className="mb-0 font-serif" style={{ fontSize: '1.5rem' }}>
            Your Bag
          </h5>
          <button
            type="button"
            className="btn btn-link p-1"
            style={{ color: '#1c1611' }}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close bag">
            <MDBIcon fas icon="xmark" size="lg" />
          </button>
        </div>

        <div className={`${styles.body} p-4`}>
          {!cart || cart.items.length === 0 ? (
            <div className="text-center mt-5">
              <MDBIcon fas icon="bag-shopping" size="3x" className="mb-3" style={{ color: 'var(--gold-soft)' }} />
              <p style={{ color: 'var(--muted)' }}>Your bag is empty.</p>
              <button type="button" className="btn-outline-noir mt-2" onClick={() => setDrawerOpen(false)}>
                Start shopping
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.key} className={`${styles.line} d-flex gap-3`}>
                {item.images[0] && (
                  <Image
                    src={item.images[0].thumbnail}
                    alt={item.images[0].alt || item.name}
                    width={84}
                    height={96}
                    className={styles.thumb} />
                )}
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between gap-2">
                    <strong className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                      {item.name}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-muted"
                      aria-label="Remove item"
                      onClick={() => removeItem(item.key)}>
                      <MDBIcon fas icon="trash-can" />
                    </button>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="qty-stepper" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                      <button type="button" aria-label="Decrease quantity" disabled={busy} onClick={() => updateQuantity(item.key, item.quantity - 1)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={busy} onClick={() => updateQuantity(item.key, item.quantity + 1)}>
                        +
                      </button>
                    </div>
                    <strong>
                      {formatPrice(
                        item.totals.line_total,
                        item.prices.currency_minor_unit,
                        item.prices.currency_symbol
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="text-center my-2">
              <MDBSpinner size="sm" role="status" />
            </div>
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="p-4 border-top">
            <div className="d-flex justify-content-between mb-1">
              <span style={{ color: 'var(--muted)' }}>Subtotal</span>
              <strong className="font-serif" style={{ fontSize: '1.3rem' }}>
                {formatPrice(cart.totals.total_price, cart.totals.currency_minor_unit, cart.totals.currency_symbol)}
              </strong>
            </div>
            <p className="small mb-3" style={{ color: 'var(--muted)' }}>
              Shipping & taxes calculated at checkout.
            </p>
            <Link href="/checkout" passHref legacyBehavior>
              <MDBBtn className="btn-gold d-block" onClick={() => setDrawerOpen(false)}>
                Proceed to checkout
              </MDBBtn>
            </Link>
            <button
              type="button"
              className="btn btn-link w-100 mt-2"
              style={{ color: 'var(--muted)', fontSize: '0.82rem', textTransform: 'uppercase' }}
              onClick={() => setDrawerOpen(false)}>
              Continue shopping
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
