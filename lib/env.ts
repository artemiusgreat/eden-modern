/**
 * Central server-side environment access. SERVER ONLY — never import from a
 * client component: required() throws wherever real process.env is
 * unavailable, i.e. the browser. Browser-facing values (analytics, Stripe,
 * address lookup) are read here and passed to client components as props.
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
  SMTP_SENDER: required('SMTP_SENDER'),
  /** HS256 secret shared with wp-config.php (JWT session verification). */
  WP_API_TOKEN: required('WP_API_TOKEN'),
  /** Optional: without these, password reset answers 500 with a clear message. */
  WP_RESET_SECRET: optional('WP_RESET_SECRET'),
  WP_ADMIN_USER: optional('WP_ADMIN_USER'),
  WP_APP_PASSWORD: optional('WP_APP_PASSWORD'),
  /** Optional: Woo REST API keys for account data. */
  WC_CONSUMER_KEY: optional('WC_CONSUMER_KEY'),
  WC_CONSUMER_SECRET: optional('WC_CONSUMER_SECRET'),
  /** Optional browser-facing integrations ('' = disabled); passed to client
      components as props from server components (see app/layout.tsx,
      app/checkout/page.tsx). */
  STAT_GOOGLE_TAG_KEY: optional('STAT_GOOGLE_TAG_KEY'),
  STAT_GOOGLE_PLACE_KEY: optional('STAT_GOOGLE_PLACE_KEY'),
  WC_STRIPE_KEY: optional('WC_STRIPE_KEY'),
};
