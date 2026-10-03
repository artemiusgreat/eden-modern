import { NextResponse } from 'next/server';

// JWT sign-out: delete the httpOnly JWT cookie. JWTs are stateless — there's
// no server-side session to invalidate. The token simply stops being sent.

const JWT_COOKIE = 'eden_jwt';

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.delete(JWT_COOKIE);
  return out;
}
