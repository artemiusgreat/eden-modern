import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Self-contained password reset completion — verifies the signed token from
// /api/auth/lost-password and updates the password via the WP REST API.
// No WordPress plugins involved.

const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');
const TOKEN_SECRET = process.env.PASSWORD_RESET_SECRET ?? '';
const WP_ADMIN_USER = process.env.WP_ADMIN_USER ?? '';
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD ?? '';

function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    // Split on the LAST dot: payload is JSON (may contain dots in email),
    // signature is hex (no dots).
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot < 0) return null;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const { userId, expiry, email } = JSON.parse(payload) as {
      userId: number;
      expiry: number;
      email: string;
    };
    if (!userId || !expiry || !email || Date.now() > expiry) return null;

    const expected = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    return { userId, email };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN_SECRET || !WP_ADMIN_USER || !WP_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Password reset is not configured.' },
        { status: 500 },
      );
    }

    const { token, password } = (await req.json()) as {
      token?: string;
      password?: string;
    };
    if (!token) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const verified = verifyToken(token);
    if (!verified) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    // Update the password via WP REST API (admin auth).
    const auth = Buffer.from(`${WP_ADMIN_USER}:${WP_APP_PASSWORD}`).toString('base64');
    const updateRes = await fetch(`${WP}/wp-json/wp/v2/users/${verified.userId}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: 'Could not update your password. Please try again.' },
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
