import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

// JWT-based sign-in via the "JWT Authentication for WP REST API" plugin.
// POSTs credentials to /wp-json/jwt-auth/v1/token, stores the returned JWT
// in an httpOnly cookie. No cookie relay, no profile.php scraping.

const WP = env.WC_STORE_URL;

const JWT_COOKIE = 'eden_jwt';
const JWT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (matches plugin default expiry)

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

    const res = await fetch(`${WP}/wp-json/jwt-auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      code?: string;
      message?: string;
    };

    if (!res.ok || !data.token) {
      // Plugin returns 403 with code jwt_auth_invalid_username/password on bad creds.
      return NextResponse.json(
        { ok: false, error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    const out = NextResponse.json({ ok: true });
    out.cookies.set(JWT_COOKIE, data.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: JWT_COOKIE_MAX_AGE,
    });
    return out;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
