import { NextResponse } from 'next/server';

// Storefront-native registration via wp-login.php?action=register (no nonce
// required by WP core). On success WP 302s to ?checkemail=registered;
// on failure it returns 200 with the error in #login_error.
// WP backend host — moved to edenapi.indemos.com at the headless cutover.
const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

function parseError(html: string): string {
  if (/registration is (currently )?not allowed/i.test(html)) {
    return 'Account registration is currently disabled on the store.';
  }
  const m = html.match(/<div id="login_error"[^>]*>([\s\S]*?)<\/div>/i);
  if (m) {
    const text = m[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(#[0-9]+|[a-z]+);/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) return text;
  }
  return 'Registration failed. Please try again.';
}

export async function POST(req: Request) {
  try {
    const { username, email } = (await req.json()) as {
      username?: string;
      email?: string;
    };
    if (!username?.trim() || !email?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Choose a username and enter your email address.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    const body = new URLSearchParams({
      user_login: username.trim(),
      user_email: email.trim(),
      'wp-submit': 'Register',
    });
    const res = await fetch(`${WP}/wp-login.php?action=register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      redirect: 'manual',
    });

    const location = res.headers.get('location') ?? '';
    if (res.status >= 300 && res.status < 400 && location.includes('checkemail=registered')) {
      return NextResponse.json({ ok: true });
    }
    if (location.includes('registration=disabled')) {
      return NextResponse.json({
        ok: false,
        error: 'Account registration is currently disabled on the store.',
      });
    }
    const html = await res.text();
    return NextResponse.json({ ok: false, error: parseError(html) });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
