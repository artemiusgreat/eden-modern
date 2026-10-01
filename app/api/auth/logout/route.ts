import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Sign-out: expire the WP auth cookies. WooCommerce cart cookies are left
// alone so the basket survives signing out.
//
// NOTE: NextResponse.cookies.set() is keyed by cookie NAME — calling it in a
// loop over paths silently collapses to a single surviving Set-Cookie header
// (the last path wins), so the real Path=/ cookies were never deleted and
// sign-out did nothing. Append one raw Set-Cookie header per cookie per path
// instead (same technique as the login relay).
const CLEAR_PATHS = ['/', '/wp-admin', '/wp-admin/', '/wp-content/plugins'];
const EXPIRED = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

export async function POST() {
  const jar = cookies();
  const out = NextResponse.json({ ok: true });
  // Clear at every path WP may have used: current logins get Path=/ (the
  // login relay widens them), but older sessions scoped the auth cookie to
  // /wp-admin and /wp-content/plugins.
  for (const c of jar.getAll()) {
    if (c.name.startsWith('wordpress_') || c.name.startsWith('wp_')) {
      for (const path of CLEAR_PATHS) {
        out.headers.append('set-cookie', `${c.name}=; ${EXPIRED}; Path=${path}`);
      }
    }
  }
  return out;
}
