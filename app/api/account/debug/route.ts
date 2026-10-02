import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Temporary diagnostic: reports session-resolution metadata. Cookie VALUE is
// never echoed — only its shape (segment count, lengths, expiration date).
// Open in a signed-in browser tab: http://localhost:3000/api/account/debug
const WC_URL = (
  process.env.WC_STORE_URL ??
  process.env.WOO_STORE_URL ??
  'https://eden.indemos.com'
).replace(/\/$/, '');

async function probe(path: string, cookieHeader: string) {
  try {
    const r = await fetch(`${WC_URL}${path}`, {
      headers: { Cookie: cookieHeader, 'User-Agent': 'EdenStorefront/1.0' },
      redirect: 'manual',
      cache: 'no-store',
    });
    return {
      status: r.status,
      location: (r.headers.get('location') ?? '').slice(0, 140) || null,
      cf_cache_status: r.headers.get('cf-cache-status'),
      age: r.headers.get('age'),
    };
  } catch (e) {
    return { status: -1, location: String(e).slice(0, 100) };
  }
}

export async function GET() {
  const jar = await cookies();
  // All WP cookies, not just the logged_in one: the session oracle needs the
  // AUTH cookie (wordpress_sec_*) too.
  const authCookies = jar.getAll().filter((c) => c.name.startsWith('wordpress_'));
  const header = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');

  // Shape of the logged_in cookie value (never the value itself).
  let shape: Record<string, unknown> | null = null;
  try {
    const loginCookie =
      authCookies.find((c) => c.name.startsWith('wordpress_logged_in_')) ?? authCookies[0];
    const raw = decodeURIComponent(loginCookie?.value ?? '');
    const parts = raw ? raw.split('|') : [];
    const exp = parts.length >= 2 ? Number(parts[1]) : NaN;
    shape = {
      segments: parts.length,
      username: parts[0] ?? null,
      expiration_iso: Number.isFinite(exp) ? new Date(exp * 1000).toISOString() : null,
      expiration_in_future: Number.isFinite(exp) ? exp > Date.now() / 1000 : null,
      token_len: parts[2]?.length ?? null,
      hmac_len: parts[3]?.length ?? null,
      total_len: raw.length,
    };
  } catch {
    shape = { parse_error: true };
  }

  const bust = `musedebug=${Date.now()}`;
  // Flap test: 5 sequential identical probes. A mix of 200/302 across them
  // means requests land on different origin servers with divergent salts.
  const flap: unknown[] = [];
  for (let i = 0; i < 5; i++) {
    flap.push(await probe('/wp-admin/profile.php', header));
  }

  // Why /api/account/orders can still 401 with reason=customer_not_found even
  // though the session is valid: customerIdForUsername() needs the WC REST
  // keys (missing/restart-needed .env.local?) and an exact username match in
  // /wc/v3/customers (an admin WP user often has no customer row). Report
  // both, without echoing any secret.
  const wcKey = process.env.WC_CONSUMER_KEY;
  const wcSecret = process.env.WC_CONSUMER_SECRET;
  const keysConfigured = !!(wcKey && wcSecret);
  const username = typeof shape?.username === 'string' ? shape.username : '';
  let customerLookup: Record<string, unknown> | null = null;
  if (keysConfigured && username) {
    try {
      const r = await fetch(
        `${WC_URL}/wp-json/wc/v3/customers?search=${encodeURIComponent(username)}&per_page=20`,
        {
          headers: {
            Authorization:
              'Basic ' + Buffer.from(`${wcKey}:${wcSecret}`).toString('base64'),
            'User-Agent': 'EdenStorefront/1.0',
          },
          cache: 'no-store',
        }
      );
      const list: unknown = await r.json().catch(() => null);
      const arr = Array.isArray(list) ? list : null;
      customerLookup = {
        status: r.status,
        result_count: arr ? arr.length : null,
        usernames: arr ? arr.map((c: any) => c?.username ?? null) : null,
        exact_match: arr ? arr.some((c: any) => c?.username === username) : false,
      };
    } catch (e) {
      customerLookup = { error: String(e).slice(0, 120) };
    }
  }
  // Can the WC customer endpoints address this WP user BY ID? ?search=
  // misses WP users without a customer row (e.g. admins), but
  // /customers/{id} may serve any WP user id directly (WC customer id ===
  // WP user id). Scrape the id from profile.php's long-stable core markup:
  // <input type="hidden" id="user_id" name="user_id" value="N" />.
  let wpUserId: number | null = null;
  let customerById: Record<string, unknown> | null = null;
  try {
    const r = await fetch(`${WC_URL}/wp-admin/profile.php`, {
      headers: { Cookie: header, 'User-Agent': 'EdenStorefront/1.0' },
      cache: 'no-store',
    });
    const html = await r.text();
    const m =
      html.match(/id="user_id"[^>]*value="(\d+)"/) ??
      html.match(/name="user_id"[^>]*value="(\d+)"/);
    wpUserId = m ? Number(m[1]) : null;
  } catch {
    wpUserId = null;
  }
  if (wpUserId && keysConfigured) {
    try {
      const r = await fetch(`${WC_URL}/wp-json/wc/v3/customers/${wpUserId}`, {
        headers: {
          Authorization:
            'Basic ' + Buffer.from(`${wcKey}:${wcSecret}`).toString('base64'),
          'User-Agent': 'EdenStorefront/1.0',
        },
        cache: 'no-store',
      });
      const body = (await r.json().catch(() => null)) as any;
      customerById = {
        status: r.status,
        id: body?.id ?? null,
        username: body?.username ?? null,
        email: body?.email ?? null,
        role: body?.role ?? null,
      };
    } catch (e) {
      customerById = { error: String(e).slice(0, 120) };
    }
  }

  return NextResponse.json({
    cookieNames: authCookies.map((c) => c.name),
    cookie_value_shape: shape,
    wc_keys_configured: keysConfigured,
    customer_lookup: customerLookup,
    wp_user_id: wpUserId,
    customer_by_id: customerById,
    profile_flap_5x: flap,
    profile_cachebusted_with_cookie: await probe(
      `/wp-admin/profile.php?${bust}`,
      header
    ),
    profile_no_cookie: await probe('/wp-admin/profile.php', ''),
    login_with_cookie: await probe('/wp-login.php', header),
  });
}
