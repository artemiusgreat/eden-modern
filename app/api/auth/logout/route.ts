import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Sign-out: expire the WP auth cookies. WooCommerce cart cookies are left
// alone so the basket survives signing out.
export async function POST() {
  const jar = cookies();
  const out = NextResponse.json({ ok: true });
  // Clear at every path WP may have used: current logins get Path=/ (the
  // login relay widens them), but older sessions scoped the auth cookie to
  // /wp-admin and /wp-content/plugins.
  const paths = ['/', '/wp-admin', '/wp-admin/', '/wp-content/plugins'];
  for (const c of jar.getAll()) {
    if (c.name.startsWith('wordpress_') || c.name.startsWith('wp_')) {
      for (const path of paths) {
        out.cookies.set(c.name, '', { expires: new Date(0), path });
      }
    }
  }
  return out;
}
