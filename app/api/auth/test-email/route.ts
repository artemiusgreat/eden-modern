import { NextResponse } from 'next/server';

// Diagnostic endpoint for password-reset email issues.
// Tests each component separately and reports exactly what's failing.
// Does NOT send any emails — only validates connections and credentials.

const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

export async function GET() {
  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // 1. Env vars present?
  const envCheck: Record<string, boolean> = {
    PASSWORD_RESET_SECRET: !!process.env.PASSWORD_RESET_SECRET,
    WP_ADMIN_USER: !!process.env.WP_ADMIN_USER,
    WP_APP_PASSWORD: !!process.env.WP_APP_PASSWORD,
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: !!process.env.SMTP_PORT,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
  };
  (report.checks as Record<string, unknown>).env = envCheck;

  // 2. WP API auth test
  const wpUser = process.env.WP_ADMIN_USER ?? '';
  const wpPass = process.env.WP_APP_PASSWORD ?? '';
  if (wpUser && wpPass) {
    try {
      const auth = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');
      const res = await fetch(`${WP}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      (report.checks as Record<string, unknown>).wp_api = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        // If 401, the username/password is wrong. If 200, auth works.
      };
      if (res.ok) {
        const me = (await res.json()) as { id?: number; slug?: string };
        (report.checks as Record<string, unknown>).wp_api = {
          ...(report.checks as Record<string, unknown>).wp_api as object,
          authenticated_as: me.slug,
          user_id: me.id,
        };
      }
    } catch (e) {
      (report.checks as Record<string, unknown>).wp_api = {
        ok: false,
        error: (e as Error).message,
      };
    }
  } else {
    (report.checks as Record<string, unknown>).wp_api = { ok: false, error: 'Missing WP_ADMIN_USER or WP_APP_PASSWORD' };
  }

  // 3. SMTP connection test (does not send email)
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        // Short timeout for diagnostic purposes
        connectionTimeout: 10000,
      });
      await transporter.verify();
      (report.checks as Record<string, unknown>).smtp = { ok: true, message: 'SMTP connection and auth successful' };
    } catch (e) {
      (report.checks as Record<string, unknown>).smtp = {
        ok: false,
        error: (e as Error).message,
      };
    }
  } else if (process.env.RESEND_API_KEY) {
    (report.checks as Record<string, unknown>).smtp = { ok: true, message: 'Using Resend API (SMTP not configured)' };
  } else {
    (report.checks as Record<string, unknown>).smtp = { ok: false, error: 'Neither SMTP_HOST nor RESEND_API_KEY is set' };
  }

  return NextResponse.json(report);
}
