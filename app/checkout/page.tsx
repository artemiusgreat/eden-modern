import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutView from '@/components/CheckoutView';

export const metadata: Metadata = { title: 'Checkout' };

/**
 * Also the landing for WooCommerce-style sharable checkout ("buy now")
 * links: `/checkout?add-to-cart=123` adds the product, then checkout loads
 * with it in the bag. The ?add-to-cart= handling itself now lives globally
 * in the root layout (works on every page); this page just renders checkout.
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutView />
    </Suspense>
  );
}
