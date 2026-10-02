'use client';

import { useEffect, useRef } from 'react';
import type { StoreProduct } from '@/lib/woo';
import { productToGaItem, trackViewItem } from '@/lib/analytics';

/** Fires GA4 view_item once per product page view. Renders nothing. */
export default function TrackViewItem({ product }: { product: StoreProduct }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    trackViewItem(productToGaItem(product));
  }, [product]);
  return null;
}
