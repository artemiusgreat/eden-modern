import { NextRequest, NextResponse } from 'next/server';

// Storefront-native lost password: proxies to WP's wp-login.php?action=lostpassword
// which sends the reset email. The email's reset link is rewritten by the
// eden-api-gate mu-plugin (lostpassword_url filter) to point at
// /account/reset-password on this storefront, so the user never sees WP.

const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // WP's lostpassword action expects a form POST with user_login.
    const body = new URLSearchParams();
    body.set('user_login', email);
    body.set('redirect_to', '');

    const res = await fetch(`${WP}/wp-login.php?action=lostpassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });

    // WP redirects on success (302 to wp-login.php?checkemail=confirm).
    // It returns 200 with errors in the HTML on failure — we treat any
    // non-500 as "email sent" to avoid user enumeration (same as WP core).
    if (res.status >= 500) {
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
