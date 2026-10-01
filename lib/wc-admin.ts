import { cookies } from 'next/headers';

// Server-only helpers for the account area. The WooCommerce REST API (wc/v3)
// needs consumer key/secret — those live in server env vars (WC_CONSUMER_KEY /
// WC_CONSUMER_SECRET) and never reach the browser. Every request is scoped to
// the signed-in WP user: the user id comes from validating their WP auth
// cookies against /wp/v2/users/me, never from client input.

const WC_URL = (
  process.env.WC_STORE_URL ??
  process.env.WOO_STORE_URL ??
  'https://eden.indemos.com'
).replace(/\/$/, '');

export function wcKeysConfigured(): boolean {
  return Boolean(process.env.WC_CONSUMER_KEY && process.env.WC_CONSUMER_SECRET);
}

export class WcError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function wcFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!wcKeysConfigured()) {
    throw new WcError(
      'Store owner setup needed: add WC_CONSUMER_KEY and WC_CONSUMER_SECRET to .env.local (WooCommerce → Settings → Advanced → REST API → Add key, Read/Write).',
      503,
    );
  }
  const auth = Buffer.from(
    `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`,
  ).toString('base64');
  const res = await fetch(`${WC_URL}/wp-json/wc/v3${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.message ? `: ${j.message}` : '';
    } catch {
      /* ignore */
    }
    throw new WcError(`Store request failed (${res.status})${detail}`, res.status >= 500 ? 502 : res.status);
  }
  return (await res.json()) as T;
}

/** Validate the visitor's WP auth cookies and return their WP user id. */
export async function getSessionUserId(): Promise<number | null> {
  const jar = cookies();
  const authCookies = jar
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith('wordpress_logged_in_') ||
        c.name.startsWith('wordpress_sec_logged_in_'),
    );
  if (!authCookies.length) return null;
  const header = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  try {
    const res = await fetch(`${WC_URL}/wp-json/wp/v2/users/me`, {
      headers: { Cookie: header },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const me = await res.json();
    return typeof me?.id === 'number' ? me.id : null;
  } catch {
    return null;
  }
}
