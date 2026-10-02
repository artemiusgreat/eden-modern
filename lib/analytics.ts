import { decodeEntities } from './woo';
import type { StoreProduct, StoreCartItem } from './woo';

/**
 * Google Tag Manager + GA4 ecommerce tracking.
 *
 * The GTM container (from the legacy WordPress site) is loaded by
 * components/Analytics.tsx; GA4 itself is configured inside that container
 * (Configuration + Event tags), exactly as on the old site. This module only
 * pushes GA4-schema ecommerce events to window.dataLayer:
 *   view_item -> product page, add_to_cart -> CartProvider.addItem,
 *   begin_checkout -> checkout page, purchase -> order confirmation.
 */

/**
 * Push a GA4 ecommerce event to the GTM dataLayer. No-op during SSR.
 * Currency comes from the Store API's currency_code on the priced object;
 * callers pass it through, defaulting to USD.
 */
export interface GaItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_category?: string;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Push a GA4 ecommerce event to the GTM dataLayer. No-op during SSR. */
function pushEcommerce(event: string, ecommerce: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // Clear the previous ecommerce object so GTM never merges stale items.
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}

/** Store API minor-units price string -> decimal, e.g. "3683" -> 36.83. */
export function minorToDecimal(minor: string | null | undefined, minorUnit = 2): number {
  return (parseInt(minor ?? '0', 10) || 0) / Math.pow(10, minorUnit);
}

export function productToGaItem(p: StoreProduct, quantity = 1): GaItem {
  return {
    item_id: p.sku || String(p.id),
    item_name: decodeEntities(p.name),
    price: minorToDecimal(p.prices.price, p.prices.currency_minor_unit),
    quantity,
    item_category: p.categories?.[0]?.name,
  };
}

export function cartLineToGaItem(item: StoreCartItem, quantity?: number): GaItem {
  return {
    item_id: item.sku || String(item.id),
    item_name: decodeEntities(item.name),
    price: minorToDecimal(item.prices.price, item.prices.currency_minor_unit),
    quantity: quantity ?? item.quantity,
  };
}

export function trackViewItem(item: GaItem, currency = 'USD') {
  pushEcommerce('view_item', {
    currency,
    value: item.price,
    items: [item],
  });
}

export function trackAddToCart(item: GaItem, currency = 'USD') {
  pushEcommerce('add_to_cart', {
    currency,
    value: Number((item.price * item.quantity).toFixed(2)),
    items: [item],
  });
}

export function trackBeginCheckout(items: GaItem[], value: number, currency = 'USD') {
  pushEcommerce('begin_checkout', { currency, value, items });
}

export function trackPurchase(
  transactionId: string,
  value: number,
  items: GaItem[],
  currency = 'USD'
) {
  pushEcommerce('purchase', {
    transaction_id: transactionId,
    currency,
    value,
    items,
  });
}
