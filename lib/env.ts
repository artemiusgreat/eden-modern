/**
 * Central server-side environment access. SERVER ONLY — never import from a
 * client component (use lib/env-client.ts there): required() throws wherever
 * real process.env is unavailable, i.e. the browser.
 *
 * Every value comes from the environment. There are no hardcoded defaults
 * anywhere in the source: a missing REQUIRED variable throws at import time
 * with the variable named, so a misconfigured deploy fails fast instead of
 * silently running against the wrong backend.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.production (server) / .env.local (dev).`
    );
  }
  return value;
}

function optional(name: string): string {
  return process.env[name] ?? '';
}

const noSlash = (v: string): string => v.replace(/\/$/, '');

function smtpPort(): number {
  const port = parseInt(required('SMTP_PORT'), 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a positive number.');
  }
  return port;
}

export const env = {
  /** WordPress/WooCommerce backend. Server-side only. */
  WC_STORE_URL: noSlash(required('WC_STORE_URL')),
  /** Public site URL (canonical links, sitemap, reset URLs). */
  NEXT_PUBLIC_SITE_URL: noSlash(required('NEXT_PUBLIC_SITE_URL')),
  /** SMTP transport — the only email transport. */
  SMTP_HOST: required('SMTP_HOST'),
  SMTP_PORT: smtpPort(),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: required('SMTP_USER'),
  SMTP_PASS: required('SMTP_PASS'),
  EMAIL_FROM: required('EMAIL_FROM'),
  /** HS256 secret shared with wp-config.php (JWT session verification). */
  JWT_AUTH_SECRET_KEY: required('JWT_AUTH_SECRET_KEY'),
  /** Optional: without these, password reset answers 500 with a clear message. */
  PASSWORD_RESET_SECRET: optional('PASSWORD_RESET_SECRET'),
  WP_ADMIN_USER: optional('WP_ADMIN_USER'),
  WP_APP_PASSWORD: optional('WP_APP_PASSWORD'),
  /** Optional: Woo REST API keys for account data. */
  WC_CONSUMER_KEY: optional('WC_CONSUMER_KEY'),
  WC_CONSUMER_SECRET: optional('WC_CONSUMER_SECRET'),
};
