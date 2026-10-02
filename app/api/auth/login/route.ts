import { NextResponse } from 'next/server';

// Storefront-native sign-in: proxies credentials to wp-login.php on the WP
// backend and relays the WP auth cookies to the browser.
// Works in production where the storefront runs on eden.indemos.com (the
// cookie is host-only for that domain). No WP plugin or REST key needed.
// WP backend host — moved to edenapi.indemos.com at the headless cutover.
// Must never be the storefront host: this route would POST credentials to
// the Next.js app itself and every login would fail as "invalid".
const WP = (process.env.WOO_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

/**
 * WP scopes its auth cookie (wordpress_sec_*) to Path=/wp-admin and
 * Path=/wp-content/plugins, so the browser would never send it back to the
 * Next.js app — and WP's own auth_redirect() (called unconditionally by every
 * wp-admin page, including our profile.php session oracle) validates THAT
 * cookie via wp_validate_auth_cookie(), not the logged_in one. Widen every
 * relayed cookie to Path=/ so the whole session round-trips.
 */
function widenPath(setCookie: string): string {
  if (/;\s*path=/i.test(setCookie)) {
    return setCookie.replace(/;\s*path=[^;]*/i, '; path=/');
  }
  return `${setCookie}; path=/`;
}

export async function POST(req: Request) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };
    if (!username?.trim() || !password) {
      return NextResponse.json(
        { ok: false, error: 'Enter your username (or email) and password.' },
        { status: 400 }
      );
    }

    // 1. Fetch the login page first so WP sets its test cookie; the login
    //    POST is rejected with a "cookies are blocked" error without it.
    const pre = await fetch(`${WP}/wp-login.php`, { redirect: 'manual' });
    const preCookies = pre.headers.getSetCookie?.() ?? [];
    const cookieHeader = preCookies.map((c) => c.split(';')[0]).join('; ');

    // 2. POST credentials. redirect:'manual' so we can capture the
    //    Set-Cookie headers from the 302 instead of following it.
    const body = new URLSearchParams({
      log: username.trim(),
      pwd: password,
      'wp-submit': 'Log In',
      redirect_to: `${WP}/my-account/`,
      testcookie: '1',
    });
    const res = await fetch(`${WP}/wp-login.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body,
      redirect: 'manual',
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    const loggedIn = setCookies.some((c) => c.startsWith('wordpress_logged_in_'));
    if (!loggedIn) {
      return NextResponse.json({ ok: false, error: 'Invalid username or password.' });
    }

    // Relay the auth cookies to the browser, widened to Path=/ (see
    // widenPath). Headers are passed as an array of tuples so every
    // Set-Cookie survives as its own header.
    const relayed = setCookies.map(widenPath);
    return new NextResponse(JSON.stringify({ ok: true }), {
      status: 200,
      headers: [
        ['content-type', 'application/json'],
        ['x-relayed-cookies', String(relayed.length)],
        ...relayed.map((c): [string, string] => ['set-cookie', c]),
      ],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
