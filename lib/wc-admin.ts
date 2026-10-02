import { cookies } from 'next/headers';

/**
 * Bridges the storefront's WP-auth-cookie session to the WooCommerce REST API.
 *
 * Why not /wp-json/wp/v2/users/me? WordPress's rest_cookie_check_errors()
 * treats ANY cookie-authed REST request without an X-WP-Nonce as
 * unauthenticated (wp_set_current_user(0) -> 401). We can't mint a wp_rest
 * nonce server-side (needs WP salts), so REST cookie auth can never work here.
 * Instead:
 *   1. Read the username from the logged_in cookie (first segment, plaintext).
 *   2. Validate the session with plain WP cookie auth on a non-REST page
 *      (wp-admin/profile.php: 200 = valid, 302 to wp-login = not). No nonce
 *      required for regular pages. NOTE: wp-admin/admin.php calls
 *      auth_redirect() unconditionally, and that validates the AUTH cookie
 *      (wordpress_sec_*) via wp_validate_auth_cookie(), NOT the logged_in
 *      one — so the proxy must forward BOTH cookies. The login relay widens
 *      WP's Path=/wp-admin-scoped auth cookie to Path=/ so the browser
 *      actually sends it back to us.
 *   3. Take the WP user id from the profile.php markup (a WC customer id IS the
 *      WP user id) and address /wc/v3/customers/{id} and /orders?customer={id}
 *      directly — this works for any WP user, including admins, whom the
 *      role-filtered /customers?search= lookup misses. The ?search= exact
 *      username match remains as a fallback if the markup ever changes.
 * The REST API keys then do all data access, scoped to that customer id.
 */

const WC_URL = (
  process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com'
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

export type SessionReason = 'no_cookie' | 'session_invalid' | 'customer_not_found';
export type SessionResolution = { id: number | null; reason: SessionReason | null };

type CacheEntry = { resolution: SessionResolution; expires: number };
const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheResolution(key: string, resolution: SessionResolution): SessionResolution {
  sessionCache.set(key, { resolution, expires: Date.now() + CACHE_TTL_MS });
  if (sessionCache.size > 500) {
    const oldest = sessionCache.keys().next();
    if (!oldest.done) sessionCache.delete(oldest.value);
  }
  return resolution;
}

function cookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Validate the WP auth cookie via plain (non-REST) cookie auth, and scrape
 *  the WP user id from profile.php's long-stable core markup
 *  (<input type="hidden" id="user_id" name="user_id" value="N" />).
 *  A WooCommerce customer id IS the WordPress user id, so the id can address
 *  /wc/v3/customers/{id} and /orders?customer={id} directly for ANY WP user
 *  (admins included) — no ?search= lookup needed. Verified live 2026-10-01:
 *  ?search=indemos returned 0 rows while /customers/1 returned 200. */
async function validateSession(
  cookieHeader: string
): Promise<{ valid: boolean; userId: number | null }> {
  try {
    const res = await fetch(`${WC_URL}/wp-admin/profile.php`, {
      headers: { Cookie: cookieHeader, ...UA },
      redirect: 'manual',
      cache: 'no-store',
    });
    // Logged in -> 200 (profile page is allowed for every role).
    // Logged out -> 302 to wp-login.php.
    if (res.status !== 200) return { valid: false, userId: null };
    const html = await res.text();
    const m =
      html.match(/id="user_id"[^>]*value="(\d+)"/) ??
      html.match(/name="user_id"[^>]*value="(\d+)"/);
    return { valid: true, userId: m ? Number(m[1]) : null };
  } catch {
    return { valid: false, userId: null };
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
 * Resolve the signed-in WP session to a WooCommerce customer id, and say why
 * when it can't (surfaced in the 401 body so the UI — and the user — can tell
 * "no session" apart from "session fine, no customer record").
 */
export async function getSessionCustomer(): Promise<SessionResolution> {
  const jar = await cookies();
  // Forward every WP cookie: profile.php's auth_redirect() validates the
  // AUTH cookie (wordpress_sec_*), while the username comes from the
  // logged_in cookie. Both are needed.
  const authCookies = jar.getAll().filter((c) => c.name.startsWith('wordpress_'));
  if (!authCookies.length) return { id: null, reason: 'no_cookie' };

  const cookieHeader = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // Cache per exact cookie value: a different/forged cookie never hits
  // another session's entry, and re-login produces a new value.
  const cached = sessionCache.get(cookieHeader);
  if (cached && cached.expires > Date.now()) return cached.resolution;

  const loginCookie =
    authCookies.find((c) => c.name.startsWith('wordpress_logged_in_')) ?? authCookies[0];
  const username = cookieValue(loginCookie.value).split('|')[0]?.trim();
  const { valid, userId } = await validateSession(cookieHeader);
  if (!valid || !username) {
    return cacheResolution(cookieHeader, { id: null, reason: 'session_invalid' });
  }

  // Prefer the scraped WP user id: it addresses the WC endpoints directly for
  // any WP user. Fall back to the ?search= username lookup if the markup ever
  // stops yielding an id.
  if (userId) {
    return cacheResolution(cookieHeader, { id: userId, reason: null });
  }
  const customerId = await customerIdForUsername(username);
  if (!customerId) {
    return cacheResolution(cookieHeader, { id: null, reason: 'customer_not_found' });
  }
  return cacheResolution(cookieHeader, { id: customerId, reason: null });
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
