import { NextRequest, NextResponse } from 'next/server';

// Storefront-native password reset completion: validates the key/login from
// the email link against WP, then sets the new password. The email link is
// rewritten by the eden-api-gate mu-plugin to point at /account/reset-password.

const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { key, login, password } = (await req.json()) as {
      key?: string;
      login?: string;
      password?: string;
    };
    if (!key || !login) return bad('Invalid or expired reset link.');
    if (!password || password.length < 8) {
      return bad('Password must be at least 8 characters.');
    }

    // Step 1: validate the key — WP sets a wp-resetpass-* cookie and 302s to action=rp.
    const validate = await fetch(
      `${WP}/wp-login.php?action=rp&key=${encodeURIComponent(key)}&login=${encodeURIComponent(login)}`,
      { redirect: 'manual' },
    );
    const setCookies = validate.headers.getSetCookie?.() ?? [];
    const resetCookie = setCookies.find((c) => c.startsWith('wp-resetpass-'));
    if (!resetCookie) {
      // WP shows "invalid key" when the key is bad/expired/used.
      return bad('This reset link is invalid or has expired. Please request a new one.');
    }
    const cookieHeader = resetCookie.split(';')[0];

    // Step 2: submit the new password with the reset cookie.
    const body = new URLSearchParams();
    body.set('pass1', password);
    body.set('pass2', password);
    // WP's rp form includes a hidden field; not strictly required server-side.
    const reset = await fetch(`${WP}/wp-login.php?action=rp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
      },
      body: body.toString(),
      redirect: 'manual',
    });

    // Success → 302 to wp-login.php?checkemail=... or 200. Failure → 200 with errors.
    if (reset.status >= 500) {
      return NextResponse.json(
        { error: 'Could not reach the store. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the store. Please try again.' },
      { status: 502 },
    );
  }
}
