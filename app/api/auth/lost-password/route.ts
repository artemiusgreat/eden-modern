import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';

// Self-contained lost password — no WordPress plugins, no WP emails.
// Generates a signed reset token and sends it via the storefront's SMTP
// transport (configured in env).

const WP = env.WC_STORE_URL;
const SITE = env.NEXT_PUBLIC_SITE_URL;
const TOKEN_SECRET = env.PASSWORD_RESET_SECRET;
// WP admin Application Password for user lookup (Users → Profile → Application Passwords).
const WP_ADMIN_USER = env.WP_ADMIN_USER;
const WP_APP_PASSWORD = env.WP_APP_PASSWORD;

function signToken(userId: number, email: string): string {
  const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
  // JSON payload (not dot-separated): emails contain dots, which would break
  // naive split('.') parsing on verify.
  const payload = JSON.stringify({ userId, expiry, email });
  const sig = createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

async function sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Reset your password',
    html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!TOKEN_SECRET || !WP_ADMIN_USER || !WP_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Password reset is not configured.' },
        { status: 500 },
      );
    }

    const { email } = (await req.json()) as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    // Look up the WP user by email (admin auth required).
    const auth = Buffer.from(`${WP_ADMIN_USER}:${WP_APP_PASSWORD}`).toString('base64');
    // context=edit is REQUIRED: WP exposes user email only in edit context
    // (view context omits the field entirely, so the find() below would
    // silently match nothing and return {ok:true} with no email sent).
    // Admin app passwords carry edit_users, so this works.
    const userRes = await fetch(`${WP}/wp-json/wp/v2/users?search=${encodeURIComponent(email)}&context=edit`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!userRes.ok) {
      // Don't reveal whether the email exists (same as WP core behavior).
      return NextResponse.json({ ok: true });
    }
    const users = (await userRes.json()) as Array<{ id: number; email?: string }>;
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = signToken(user.id, email);
    const resetUrl = `${SITE}/account/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendResetEmail(email, resetUrl);
    if (!sent) {
      return NextResponse.json(
        { error: 'Email service is not configured.' },
        { status: 500 },
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
