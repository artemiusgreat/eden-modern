import { NextResponse } from 'next/server';
import { getSessionCustomer, wcFetch, WcError } from '@/lib/wc-admin';

// The signed-in customer's own profile: email, name, billing & shipping
// addresses. Everything is scoped to the WP session user — the id never
// comes from the client.

const pickCustomer = (c: any) => ({
  email: c.email ?? '',
  first_name: c.first_name ?? '',
  last_name: c.last_name ?? '',
  billing: c.billing ?? {},
  shipping: c.shipping ?? {},
});

const err = (e: unknown) => {
  if (e instanceof WcError)
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : 'Could not reach the store.';
  return NextResponse.json({ ok: false, error: msg }, { status: 502 });
};

export async function GET() {
  try {
    const session = await getSessionCustomer();
    if (!session.id)
      return NextResponse.json(
        { ok: false, error: 'Not signed in.', reason: session.reason },
        { status: 401 }
      );
    const userId = session.id;
    const c = await wcFetch<any>(`/customers/${userId}`);
    return NextResponse.json({ ok: true, customer: pickCustomer(c) });
  } catch (e) {
    return err(e);
  }
}

const ADDR_KEYS = [
  'first_name',
  'last_name',
  'company',
  'address_1',
  'address_2',
  'city',
  'state',
  'postcode',
  'country',
  'email',
  'phone',
] as const;

const cleanAddress = (a: any) => {
  const out: Record<string, string> = {};
  if (a && typeof a === 'object') {
    for (const k of ADDR_KEYS) if (typeof a[k] === 'string') out[k] = a[k].slice(0, 200);
  }
  return out;
};

export async function PUT(req: Request) {
  try {
    const session = await getSessionCustomer();
    if (!session.id)
      return NextResponse.json(
        { ok: false, error: 'Not signed in.', reason: session.reason },
        { status: 401 }
      );
    const userId = session.id;
    const body = await req.json().catch(() => ({}));

    if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (body.password !== undefined && body.password !== '' && String(body.password).length < 8) {
      return NextResponse.json(
        { ok: false, error: 'New password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {};
    for (const k of ['first_name', 'last_name', 'email'] as const) {
      if (typeof body[k] === 'string') payload[k] = body[k].slice(0, 200);
    }
    if (typeof body.password === 'string' && body.password !== '') payload.password = body.password;
    if (body.billing !== undefined) payload.billing = cleanAddress(body.billing);
    if (body.shipping !== undefined) payload.shipping = cleanAddress(body.shipping);

    const c = await wcFetch<any>(`/customers/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ ok: true, customer: pickCustomer(c) });
  } catch (e) {
    return err(e);
  }
}
