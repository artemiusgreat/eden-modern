import { NextResponse } from 'next/server';
import { getSessionCustomerId, wcFetch, WcError } from '@/lib/wc-admin';

// One order's full detail. The order id comes from the URL, but ownership is
// re-checked: the order's customer_id must match the WP session user.

const addr = (a: any) =>
  a
    ? {
        first_name: a.first_name ?? '',
        last_name: a.last_name ?? '',
        address_1: a.address_1 ?? '',
        address_2: a.address_2 ?? '',
        city: a.city ?? '',
        state: a.state ?? '',
        postcode: a.postcode ?? '',
        country: a.country ?? '',
      }
    : null;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await getSessionCustomerId();
    if (!userId)
      return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
    const orderId = Number(params.id);
    if (!Number.isFinite(orderId))
      return NextResponse.json({ ok: false, error: 'Invalid order.' }, { status: 400 });
    const o = await wcFetch<any>(`/orders/${orderId}`);
    if (Number(o.customer_id) !== userId)
      return NextResponse.json({ ok: false, error: 'Order not found.' }, { status: 404 });
    return NextResponse.json({
      ok: true,
      order: {
        id: o.id,
        number: o.number,
        date: o.date_created,
        status: o.status,
        currency: o.currency,
        payment_method: o.payment_method_title ?? '',
        subtotal: o.subtotal ?? null,
        shipping_total: o.shipping_total ?? null,
        tax_total: o.total_tax ?? null,
        discount_total: o.discount_total ?? null,
        total: o.total,
        billing: addr(o.billing),
        shipping: addr(o.shipping),
        items: (o.line_items ?? []).map((li: any) => ({
          name: li.name,
          quantity: li.quantity,
          total: li.total,
          image: li.image?.src ?? null,
        })),
      },
    });
  } catch (e) {
    if (e instanceof WcError)
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    return NextResponse.json({ ok: false, error: 'Could not reach the store.' }, { status: 502 });
  }
}
