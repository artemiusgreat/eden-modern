import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutView from '@/components/CheckoutView';
import AddToCartParam from '@/components/AddToCartParam';

export const metadata: Metadata = { title: 'Checkout' };

/**
 * Also the landing for WooCommerce-style sharable checkout ("buy now")
 * links: `/checkout?add-to-cart=123` adds the product, then checkout loads
 * with it in the bag.
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <AddToCartParam />
      <CheckoutView />
    </Suspense>
  );
}
