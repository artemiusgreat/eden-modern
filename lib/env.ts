/**
 * Central server-side environment access.
 *
 * Values are read LAZILY (getters): importing this module never touches
 * process.env, so transitive imports from client components are safe.
 * (Client bundles only inline static `process.env.NEXT_PUBLIC_*` access;
 * dynamic `process.env[name]` is never inlined, so eager reads would throw
 * in the browser even with a correct .env file.)
 *
 * The first actual read of a REQUIRED variable throws with the variable
 * named when it is missing, so a misconfigured server still fails fast
 * instead of silently running against the wrong backend.
 *
 * Every value comes from the environment — there are no hardcoded defaults
 * anywhere in the source.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    const hint =
      typeof window === 'undefined'
        ? 'Set it in .env.production (server) / .env.local (dev).'
        : 'This value is server-only and cannot be read in the browser — ' +
          'pass it as a prop from a server component instead.';
    throw new Error(`Missing required environment variable: ${name}. ${hint}`);
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
  get WC_STORE_URL(): string {
    return noSlash(required('WC_STORE_URL'));
  },
  /** Public site URL (canonical links, sitemap, reset URLs). */
  get NEXT_PUBLIC_SITE_URL(): string {
    return noSlash(required('NEXT_PUBLIC_SITE_URL'));
  },
  /** SMTP transport — the only email transport. */
  get SMTP_HOST(): string {
    return required('SMTP_HOST');
  },
  get SMTP_PORT(): number {
    return smtpPort();
  },
  get SMTP_SECURE(): boolean {
    return process.env.SMTP_SECURE === 'true';
  },
  get SMTP_USER(): string {
    return required('SMTP_USER');
  },
  get SMTP_PASS(): string {
    return required('SMTP_PASS');
  },
  get SMTP_SENDER(): string {
    return required('SMTP_SENDER');
  },
  /** HS256 secret shared with wp-config.php (JWT session verification). */
  get WP_API_TOKEN(): string {
    return required('WP_API_TOKEN');
  },
  /** Optional: without these, password reset answers 500 with a clear message. */
  get WP_RESET_SECRET(): string {
    return optional('WP_RESET_SECRET');
  },
  get WP_ADMIN_USER(): string {
    return optional('WP_ADMIN_USER');
  },
  get WP_APP_PASSWORD(): string {
    return optional('WP_APP_PASSWORD');
  },
  /** Optional: Woo REST API keys for account data. */
  get WC_CONSUMER_KEY(): string {
    return optional('WC_CONSUMER_KEY');
  },
  get WC_CONSUMER_SECRET(): string {
    return optional('WC_CONSUMER_SECRET');
  },
  /** Optional browser-facing integrations ('' = disabled); passed to client
      components as props from server components (see app/layout.tsx,
      app/checkout/page.tsx). */
  get STAT_GOOGLE_TAG_KEY(): string {
    return optional('STAT_GOOGLE_TAG_KEY');
  },
  get STAT_GOOGLE_PLACE_KEY(): string {
    return optional('STAT_GOOGLE_PLACE_KEY');
  },
  get WC_STRIPE_KEY(): string {
    return optional('WC_STRIPE_KEY');
  },
};
