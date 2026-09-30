import { NextRequest, NextResponse } from 'next/server';
import { addItem } from '@/lib/woo-cart';

/**
 * WooCommerce-style shareable cart URLs for the headless storefront, for
 * referral links (Facebook, Google, etc.).
 *
 *   /api/cart/add?add-to-cart=123
 *     → adds product 123 (qty 1), redirects to /cart
 *   /api/cart/add?add-to-cart=123&quantity=2
 *     → adds 2 × product 123, redirects to /cart
 *   /api/cart/add?add-to-cart=123,456&redirect=/checkout
 *     → adds products 123 and 456, goes straight to checkout
 *
 * Mirrors the WordPress behavior documented at:
 *   https://woocommerce.com/document/quick-guide-to-woocommerce-add-to-cart-urls/
 *   https://woocommerce.com/document/creating-sharable-checkout-urls-in-woocommerce/
 *
 * The guest cart token is kept in the same httpOnly cookie the /api/cart
 * proxy uses, so the added items are in the shopper's bag when they land.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const ids = (params.get('add-to-cart') ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  const quantity = Math.max(1, Math.floor(Number(params.get('quantity')) || 1));

  // Only allow local redirects — never bounce shoppers to an external URL.
  const rawRedirect = params.get('redirect') ?? '/cart';
  const redirect =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/cart';

  if (ids.length === 0) {
    return NextResponse.redirect(new URL('/cart', req.url));
  }

  try {
    for (const id of ids) {
      await addItem(id, quantity);
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }

  return NextResponse.redirect(new URL(redirect, req.url));
}
