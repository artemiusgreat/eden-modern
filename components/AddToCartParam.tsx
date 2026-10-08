'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart/CartProvider';

/**
 * WooCommerce-style `?add-to-cart=<id>&quantity=<n>` handling, plus the
 * sharable-checkout-URL bundle form `?products=ID:QTY,…&coupon=CODE`
 * (Meta shop links hit /checkout-link, which 308s here with the query
 * string intact).
 *
 * The add goes through the existing /api/cart proxy (WooCommerce's own
 * Store API), keeping the guest session in the same httpOnly cookie the
 * drawer and checkout already use. On success the shopper lands directly
 * on /checkout, whose order summary lists the bag — there is no standalone
 * bag page anymore. On failure the params are stripped and the shopper
 * stays put, so a bad id can't send them to an empty checkout. Params are
 * consumed one-shot so a refresh can't re-add.
 */
export default function AddToCartParam() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, addItem, importBundle, setDrawerOpen } = useCart();
  const done = useRef(false);

  useEffect(() => {
    // Wait for the provider's initial cart load so the add's refetch wins.
    if (loading || done.current) return;
    const clean = () => router.replace(pathname, { scroll: false });

    // Bundle links are a checkout concern; anywhere else ?products= is ignored.
    const productsRaw = params.get('products');
    if (productsRaw !== null && pathname === '/checkout') {
      done.current = true;
      const entries = productsRaw
        .split(',')
        .map((p) => {
          const [idRaw = '', qtyRaw] = p.trim().split(':');
          return {
            id: /^\d+$/.test(idRaw) ? parseInt(idRaw, 10) : 0,
            quantity: Math.min(999, Math.max(1, Math.floor(Number(qtyRaw) || 1))),
          };
        })
        .filter((e) => e.id > 0);
      const coupon = params.get('coupon')?.trim() || undefined;
      importBundle(entries, coupon).then(clean, clean);
      return;
    }

    const raw = params.get('add-to-cart');
    if (raw === null) return;
    done.current = true;

    const id = /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : 0;
    const quantity = Math.min(999, Math.max(1, Math.floor(Number(params.get('quantity')) || 1)));

    if (id > 0) {
      // addItem opens the bag drawer on success; close it again before
      // leaving — both state updates batch, so it never visibly flashes.
      addItem(id, quantity).then(
        () => {
          setDrawerOpen(false);
          router.replace('/checkout');
        },
        clean,
      );
    } else {
      clean();
    }
  }, [loading, params, pathname, router, addItem, importBundle, setDrawerOpen]);

  return null;
}
