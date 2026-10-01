import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Temporary diagnostic: reports session-resolution metadata WITHOUT secret
// values (cookie names only, never values). Open in a signed-in browser tab:
//   http://localhost:3000/api/account/debug
const WC_URL = (
  process.env.WC_STORE_URL ??
  process.env.WOO_STORE_URL ??
  'https://eden.indemos.com'
).replace(/\/$/, '');

async function probe(path: string, cookieHeader: string) {
  try {
    const r = await fetch(`${WC_URL}${path}`, {
      headers: { Cookie: cookieHeader, 'User-Agent': 'EdenStorefront/1.0' },
      redirect: 'manual',
      cache: 'no-store',
    });
    return {
      status: r.status,
      location: (r.headers.get('location') ?? '').slice(0, 100) || null,
    };
  } catch (e) {
    return { status: -1, location: String(e).slice(0, 100) };
  }
}

export async function GET() {
  const jar = await cookies();
  const authCookies = jar
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith('wordpress_logged_in_') ||
        c.name.startsWith('wordpress_sec_logged_in_')
    );
  const header = authCookies.map((c) => `${c.name}=${c.value}`).join('; ');
  let username = '';
  try {
    username = decodeURIComponent(authCookies[0]?.value ?? '').split('|')[0] ?? '';
  } catch {
    username = '';
  }
  return NextResponse.json({
    cookieNames: authCookies.map((c) => c.name),
    username,
    profile_with_cookie: await probe('/wp-admin/profile.php', header),
    profile_no_cookie: await probe('/wp-admin/profile.php', ''),
    login_with_cookie: await probe('/wp-login.php', header),
  });
}
