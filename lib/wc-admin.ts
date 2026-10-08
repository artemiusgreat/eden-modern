import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { env } from './env';

/**
 * Bridges the storefront's JWT session to the WooCommerce REST API.
 *
 * Auth flow (via "JWT Authentication for WP REST API" plugin):
 *   1. User signs in via /api/auth/login -> POST /wp-json/jwt-auth/v1/token
 *      with username/password -> JWT stored in httpOnly `eden_jwt` cookie.
 *   2. getSessionCustomer() reads the JWT from the cookie, verifies the
 *      HS256 signature with JWT_AUTH_SECRET_KEY (must match wp-config.php),
 *      and extracts the WP user id from the token payload (data.user.id).
 *   3. A WC customer id IS the WP user id, so /wc/v3/customers/{id} and
 *      /orders?customer={id} are addressed directly. The ?search= username
 *      lookup remains as a fallback.
 * The REST API keys then do all data access, scoped to that customer id.
 */

const WC_URL = env.WC_STORE_URL;

const JWT_SECRET = env.JWT_AUTH_SECRET_KEY;
const JWT_COOKIE = 'eden_jwt';

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
 * Resolve the JWT session to a WooCommerce customer id, and say why
 * when it can't (surfaced in the 401 body so the UI — and the user — can tell
 * "no session" apart from "session fine, no customer record").
 */
export async function getSessionCustomer(): Promise<SessionResolution> {
  const jar = await cookies();
  const token = jar.get(JWT_COOKIE)?.value;
  if (!token) return { id: null, reason: 'no_cookie' };

  // Cache per exact token value: a different token never hits another
  // session's entry, and re-login produces a new value.
  const cached = sessionCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.resolution;

  let userId: number | null = null;
  let username: string | null = null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as {
      data?: { user?: { id?: number | string; user_nicename?: string } };
    };
    // The WP JWT plugin json_encodes the MySQL row, so the user id arrives
    // as a string ("3"), not a number. Accept both.
    const rawId = payload.data?.user?.id;
    const parsedId = rawId != null ? Number(rawId) : NaN;
    userId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
    username = payload.data?.user?.user_nicename ?? null;
  } catch {
    return cacheResolution(token, { id: null, reason: 'session_invalid' });
  }

  if (!userId) {
    return cacheResolution(token, { id: null, reason: 'session_invalid' });
  }

  // A WC customer id IS the WP user id — address endpoints directly.
  // Fall back to ?search= username lookup if the token lacks the id.
  return cacheResolution(token, { id: userId, reason: null });
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
