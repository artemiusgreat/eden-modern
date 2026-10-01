import { cookies } from 'next/headers';

/**
 * Bridges the storefront's WP-auth-cookie session to the WooCommerce REST API.
 *
 * Why not /wp-json/wp/v2/users/me? WordPress's rest_cookie_check_errors()
 * treats ANY cookie-authed REST request without an X-WP-Nonce as
 * unauthenticated (wp_set_current_user(0) -> 401). We can't mint a wp_rest
 * nonce server-side (needs WP salts), so REST cookie auth can never work here.
 * Instead:
 *   1. Read the username from the auth cookie (first segment, plaintext).
 *   2. Validate the cookie is genuine with plain WP cookie auth on a
 *      non-REST page (wp-admin/profile.php: 200 = valid, 302 to wp-login =
 *      not). No nonce required for regular pages.
 *   3. Map username -> WooCommerce customer id via /wc/v3/customers?search=
 *      with an exact username match (WP usernames are unique).
 * The REST API keys then do all data access, scoped to that customer id.
 */

const WC_URL = (
  process.env.WC_STORE_URL ??
  process.env.WOO_STORE_URL ??
  'https://eden.indemos.com'
).replace(/\/$/, '');

const UA = { 'User-Agent': 'EdenStorefront/1.0' };

function basicAuth(): string | null {
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!key || !secret) return null;
  return 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
}

export function wcKeysConfigured(): boolean {
  return basicAuth() !== null;
}

/** Error carrying an HTTP status, for route handlers to map to responses. */
export class WcError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'WcError';
    this.status = status;
  }
}

type CacheEntry = { customerId: number | null; expires: number };
const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Validate the WP auth cookie via plain (non-REST) cookie auth. */
async function cookieIsValid(cookieHeader: string): Promise<boolean> {
  try {
    const res = await fetch(`${WC_URL}/wp-admin/profile.php`, {
      headers: { Cookie: cookieHeader, ...UA },
      redirect: 'manual',
      cache: 'no-store',
    });
    // Logged in -> 200 (profile page is allowed for every role).
    // Logged out -> 302 to wp-login.php.
    return res.status === 200;
  } catch {
    return false;
  }
}

/** Exact-match a WP username to a WooCommerce customer id. */
async function customerIdForUsername(username: string): Promise<number | null> {
  const auth = basicAuth();
  if (!auth) return null;
  try {
    const res = await fetch(
      `${WC_URL}/wp-json/wc/v3/customers?search=${encodeURIComponent(username)}&per_page=20`,
      { headers: { Authorization: auth, ...UA }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list)) return null;
    const match = list.find((c) => c && c.username === username);
    return typeof match?.id === 'number' ? match.id : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the signed-in WP session to a WooCommerce customer id.
 * Returns null when there is no session, the cookie is forged/invalid,
 * or the user has no WooCommerce customer record.
 */
export async function getSessionCustomerId(): Promise<number | null> {
  const jar = await cookies();
  const authCookies = jar
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith('wordpress_logged_in_') ||
        c.name.startsWith('wordpress_sec_logged_in_')
    );
  if (!authCookies.length) return null;

  const cookieHeader = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // Cache per exact cookie value: a different/forged cookie never hits
  // another session's entry, and re-login produces a new value.
  const cached = sessionCache.get(cookieHeader);
  if (cached && cached.expires > Date.now()) return cached.customerId;

  const username = cookieValue(authCookies[0].value).split('|')[0]?.trim();
  let customerId: number | null = null;
  if (username && (await cookieIsValid(cookieHeader))) {
    customerId = await customerIdForUsername(username);
  }

  sessionCache.set(cookieHeader, { customerId, expires: Date.now() + CACHE_TTL_MS });
  if (sessionCache.size > 500) {
    const oldest = sessionCache.keys().next();
    if (!oldest.done) sessionCache.delete(oldest.value);
  }
  return customerId;
}

/**
 * Call the WooCommerce REST API with the server-side keys.
 * Returns the parsed JSON body; throws WcError (with HTTP status) on failure.
 */
export async function wcFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const auth = basicAuth();
  if (!auth) {
    throw new WcError(
      'WooCommerce REST API keys are not configured. Add WC_CONSUMER_KEY and WC_CONSUMER_SECRET to .env.local (see .env.example).',
      503
    );
  }
  const res = await fetch(`${WC_URL}/wp-json/wc/v3${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      ...UA,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && typeof data.message === 'string' && data.message) ||
      `Store request failed (HTTP ${res.status}).`;
    throw new WcError(msg, res.status);
  }
  return data as T;
}
