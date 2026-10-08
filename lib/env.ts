/**
 * Central server-side environment access.
 *
 * EAGER validation: every REQUIRED variable is checked once at module load
 * on the server — a misconfigured deploy fails fast at build/startup with
 * the variable named, instead of dying on the first request that needs it.
 * The check is skipped in the browser (`typeof window`), where server vars
 * don't exist: this module lands in client bundles transitively
 * (CartProvider → analytics → lib/woo → here), and client code only ever
 * reads NEXT_PUBLIC_* via static `process.env.NEXT_PUBLIC_*` access.
 *
 * Every value comes from the environment — there are no hardcoded defaults
 * anywhere in the source.
 */

const REQUIRED_VARS = [
  'WC_STORE_URL',
  'NEXT_PUBLIC_SITE_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_SENDER',
  'WP_API_TOKEN',
] as const;

if (typeof window === 'undefined') {
  for (const name of REQUIRED_VARS) {
    if (!process.env[name]) {
      throw new Error(
        `Missing required environment variable: ${name}. ` +
          `Set it in .env.production (server) / .env.local (dev).`,
      );
    }
  }
}

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
};
