'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCart } from './cart/CartProvider';

/**
 * WooCommerce-style `?add-to-cart=<id>&quantity=<n>` handling for pages.
 *
 * Visiting `/cart?add-to-cart=123` adds product 123 to the bag and lands on
 * the cart page; `/checkout?add-to-cart=123` (Woo's sharable-checkout-URL
 * pattern) adds it and lands on checkout.
 *
 * The add itself goes through the existing /api/cart proxy, which calls
 * WooCommerce's own Store API endpoint (`POST /cart/add-item`) and keeps
 * the guest session in the same httpOnly cookie the drawer and checkout
 * already use — so the item is in the shopper's bag when they land.
 * Params are stripped after the add so a refresh can't add twice.
 */
export default function AddToCartParam() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, addItem } = useCart();
  const done = useRef(false);

  useEffect(() => {
    // Wait for the provider's initial cart load so the add's refetch wins.
    if (loading || done.current) return;
    const raw = params.get('add-to-cart');
    if (raw === null) return;
    done.current = true;

    const clean = () => router.replace(pathname, { scroll: false });
    const id = /^\d+$/.test(raw.trim()) ? parseInt(raw.trim(), 10) : 0;
    const quantity = Math.min(999, Math.max(1, Math.floor(Number(params.get('quantity')) || 1)));

    if (id > 0) {
      // The provider refetches the cart after the POST, so the bag is
      // current; then strip the params so a refresh can't re-add.
      addItem(id, quantity).then(clean, clean);
    } else {
      clean();
    }
  }, [loading, params, pathname, router, addItem]);

  return null;
}
