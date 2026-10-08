import type { Metadata } from 'next';
import { Suspense } from 'react';
import CheckoutView from '@/components/CheckoutView';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = { title: 'Checkout' };

/**
 * The order summary on this page lists everything in the bag, so this is
 * also the landing for WooCommerce-style sharable checkout links:
 * `/checkout-link?products=14674:1&coupon=SAVE10` (Meta shop links) 308s
 * here with the query string intact, and `/checkout?add-to-cart=123`
 * works too. The param handling itself lives globally in the root layout
 * (AddToCartParam); this page just renders checkout.
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary label="Checkout">
        <CheckoutView />
      </ErrorBoundary>
    </Suspense>
  );
}
