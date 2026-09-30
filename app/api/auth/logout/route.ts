import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Sign-out: expire the WP auth cookies. WooCommerce cart cookies are left
// alone so the basket survives signing out.
export async function POST() {
  const jar = cookies();
  const out = NextResponse.json({ ok: true });
  for (const c of jar.getAll()) {
    if (c.name.startsWith('wordpress_') || c.name.startsWith('wp_')) {
      out.cookies.set(c.name, '', { expires: new Date(0), path: '/' });
    }
  }
  return out;
}
