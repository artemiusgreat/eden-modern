/**
 * Client-safe environment access. Only NEXT_PUBLIC_* variables, which Next.js
 * inlines into the browser bundle at build time — importing this module never
 * touches server-only secrets. Every value is optional: '' means the
 * integration is disabled.
 *
 * NOTE: static member access (process.env.NEXT_PUBLIC_X) is required here.
 * Dynamic process.env[name] is NOT inlined by Next.js and breaks in the
 * browser.
 */
export const clientEnv = {
  NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID ?? '',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  NEXT_PUBLIC_GOOGLE_PLACES_KEY: process.env.NEXT_PUBLIC_GOOGLE_PLACES_KEY ?? '',
};
