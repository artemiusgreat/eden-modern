import type { Metadata } from 'next';
import { Suspense } from 'react';
import CartPageView from '@/components/CartPageView';

export const metadata: Metadata = { title: 'Shopping Bag' };

/**
 * The bag as a page. Also the landing for WooCommerce-style shareable
 * add-to-cart links: `/cart?add-to-cart=123&quantity=2` adds the product
 * (handled client-side in CartPageView via the Store API) and stays here.
 */
export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageView />
    </Suspense>
  );
}
