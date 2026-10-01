import { NextResponse } from 'next/server';
import { getSessionCustomerId, wcFetch, WcError } from '@/lib/wc-admin';

// The signed-in customer's own orders, newest first. Scoped by WP session
// user id — never by client input.

const pickLine = (li: any) => ({
  name: li.name,
  quantity: li.quantity,
  total: li.total,
});

export async function GET() {
  try {
    const userId = await getSessionCustomerId();
    if (!userId)
      return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
    const orders = await wcFetch<any[]>(
      `/orders?customer=${userId}&per_page=25&orderby=date&order=desc`,
    );
    return NextResponse.json({
      ok: true,
      orders: orders.map((o) => ({
        id: o.id,
        number: o.number,
        date: o.date_created,
        status: o.status,
        total: o.total,
        currency: o.currency,
        items: (o.line_items ?? []).map(pickLine),
      })),
    });
  } catch (e) {
    if (e instanceof WcError)
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    return NextResponse.json({ ok: false, error: 'Could not reach the store.' }, { status: 502 });
  }
}
