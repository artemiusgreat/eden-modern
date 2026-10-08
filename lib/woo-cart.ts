/**
 * Server-side cart session against the Woo Store API.
 * The Store API identifies a guest cart via the `Cart-Token` response/request
 * header and requires a fresh `Nonce` header on every mutation. We persist the
 * token in an httpOnly cookie so the browser never sees it.
 */
import { cookies } from 'next/headers';
import type { StoreCart } from './woo';

const WC = process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com';
const TOKEN_COOKIE = 'woo_cart_token';

async function cartRequest(method: 'GET' | 'POST', path: string, body?: unknown): Promise<StoreCart> {
  const jar = await cookies();
  const storedToken = jar.get(TOKEN_COOKIE)?.value;

  // Every mutation needs a fresh Nonce; fetch it from the cart endpoint.
  const sessionHeaders: Record<string, string> = {};
  if (storedToken) sessionHeaders['Cart-Token'] = storedToken;

  const sessionRes = await fetch(`${WC}/wp-json/wc/store/v1/cart`, {
    method: 'GET',
    headers: sessionHeaders,
    cache: 'no-store',
  });
  const nonce = sessionRes.headers.get('Nonce');
  const sessionToken = sessionRes.headers.get('Cart-Token') ?? storedToken;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (nonce) headers['Nonce'] = nonce;
  if (sessionToken) headers['Cart-Token'] = sessionToken;

  const res = await fetch(`${WC}/wp-json/wc/store/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const respToken = res.headers.get('Cart-Token');
  if (respToken && respToken !== storedToken) {
    jar.set(TOKEN_COOKIE, respToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Store API ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as StoreCart;
}

export const getCart = () => cartRequest('GET', '/cart');
export const addItem = (id: number, quantity = 1) =>
  cartRequest('POST', '/cart/add-item', { id, quantity });
export const updateItem = (key: string, quantity: number) =>
  cartRequest('POST', '/cart/update-item', { key, quantity });
export const removeItem = (key: string) => cartRequest('POST', '/cart/remove-item', { key });
export const applyCoupon = (code: string) =>
  cartRequest('POST', '/cart/apply-coupon', { code });
export const updateCustomer = (billing_address: unknown, shipping_address: unknown) =>
  cartRequest('POST', '/cart/update-customer', { billing_address, shipping_address });
export const selectShippingRate = (package_id: number, rate_id: string) =>
  cartRequest('POST', '/cart/select-shipping-rate', { package_id, rate_id });

/* ---------- checkout ---------- */

export interface CheckoutAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone: string;
}

export interface CheckoutTotals {
  total_items: string;
  total_shipping: string | null;
  total_tax: string;
  total_discount: string;
  total_price: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface CheckoutShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  taxes: string;
  method_id: string;
  selected: boolean;
}

export interface CheckoutShippingPackage {
  package_id: number;
  name: string;
  shipping_rates: CheckoutShippingRate[];
}

export interface CheckoutCartData {
  items_count: number;
  totals: CheckoutTotals;
  shipping_rates: CheckoutShippingPackage[];
  payment_methods: string[];
  needs_shipping: boolean;
  needs_payment: boolean;
  has_calculated_shipping: boolean;
}

export interface CheckoutPaymentResult {
  payment_status: 'success' | 'pending' | 'failure' | 'error' | string;
  payment_details: Record<string, unknown>;
}

export interface CheckoutResponse {
  order_id: number;
  order_number: string;
  billing_address: CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method: string;
  payment_result: CheckoutPaymentResult | null;
  __experimentalCart: CheckoutCartData;
}

export interface PlaceOrderBody {
  billing_address: CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method: string;
  payment_data?: { key: string; value: string }[];
  customer_note?: string;
  create_account?: boolean;
}

async function checkoutRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<CheckoutResponse> {
  const jar = await cookies();
  const storedToken = jar.get(TOKEN_COOKIE)?.value;

  // The checkout endpoint requires a fresh Nonce, same as cart mutations.
  const sessionHeaders: Record<string, string> = {};
  if (storedToken) sessionHeaders['Cart-Token'] = storedToken;

  const sessionRes = await fetch(`${WC}/wp-json/wc/store/v1/cart`, {
    method: 'GET',
    headers: sessionHeaders,
    cache: 'no-store',
  });
  const nonce = sessionRes.headers.get('Nonce');
  const sessionToken = sessionRes.headers.get('Cart-Token') ?? storedToken;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (nonce) headers['Nonce'] = nonce;
  if (sessionToken) headers['Cart-Token'] = sessionToken;

  const res = await fetch(`${WC}/wp-json/wc/store/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const respToken = res.headers.get('Cart-Token');
  if (respToken && respToken !== storedToken) {
    jar.set(TOKEN_COOKIE, respToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const data = (await res.json().catch(() => null)) as CheckoutResponse & {
    code?: string;
    message?: string;
  };
  if (!res.ok || (data && data.code && !data.order_id)) {
    const err = new Error(
      (data && (data.message as string)) || `Store API ${path} -> ${res.status}`,
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data as CheckoutResponse;
}

export const getCheckout = () => checkoutRequest('GET', '/checkout');
export const placeOrder = (body: PlaceOrderBody) => checkoutRequest('POST', '/checkout', body);
