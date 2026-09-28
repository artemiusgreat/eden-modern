/**
 * Server-side cart session against the Woo Store API.
 * The Store API identifies a guest cart via the `Cart-Token` response/request
 * header and requires a fresh `Nonce` header on every mutation. We persist the
 * token in an httpOnly cookie so the browser never sees it.
 */
import { cookies } from 'next/headers';
import type { StoreCart } from './woo';

const WOO = process.env.WOO_STORE_URL ?? 'https://eden.indemos.com';
const TOKEN_COOKIE = 'woo_cart_token';

async function cartRequest(method: 'GET' | 'POST', path: string, body?: unknown): Promise<StoreCart> {
  const jar = cookies();
  const storedToken = jar.get(TOKEN_COOKIE)?.value;

  // Every mutation needs a fresh Nonce; fetch it from the cart endpoint.
  const sessionHeaders: Record<string, string> = {};
  if (storedToken) sessionHeaders['Cart-Token'] = storedToken;

  const sessionRes = await fetch(`${WOO}/wp-json/wc/store/v1/cart`, {
    method: 'GET',
    headers: sessionHeaders,
    cache: 'no-store',
  });
  const nonce = sessionRes.headers.get('Nonce');
  const sessionToken = sessionRes.headers.get('Cart-Token') ?? storedToken;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (nonce) headers['Nonce'] = nonce;
  if (sessionToken) headers['Cart-Token'] = sessionToken;

  const res = await fetch(`${WOO}/wp-json/wc/store/v1${path}`, {
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
