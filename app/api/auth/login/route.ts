import { NextResponse } from 'next/server';

// Storefront-native sign-in: proxies credentials to wp-login.php on the WP
// backend and relays the wordpress_logged_in_* auth cookie to the browser.
// Works in production where the storefront runs on eden.indemos.com (the
// cookie is host-only for that domain). No WP plugin or REST key needed.
const WP = 'https://eden.indemos.com';

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

    // 3. Relay the auth cookies to the browser verbatim.
    const out = NextResponse.json({ ok: true });
    for (const c of setCookies) out.headers.append('set-cookie', c);
    return out;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
