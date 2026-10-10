import { NextResponse } from 'next/server';
import { getSessionCustomer, wcFetch, WcError } from '@/lib/wc-admin';

// The signed-in customer's own orders, newest first. Scoped by WP session
// user id — never by client input.

const pickLine = (li: any) => ({
  name: li.name,
  quantity: li.quantity,
  total: li.total,
});

export async function GET(req: Request) {
  try {
    const session = await getSessionCustomer();
    if (!session.id)
      return NextResponse.json(
        { ok: false, error: 'Not signed in.', reason: session.reason },
        { status: 401 }
      );
    const userId = session.id;
    // Paged, 10 per page. We fetch one extra to know whether a next page
    // exists (wcFetch doesn't expose the X-WP-TotalPages header).
    const PER_PAGE = 10;
    const page = Math.max(
      1,
      parseInt(new URL(req.url).searchParams.get('page') ?? '1', 10) || 1
    );
    const orders = await wcFetch<any[]>(
      `/orders?customer=${userId}&per_page=${PER_PAGE + 1}&page=${page}&orderby=date&order=desc`,
    );
    const hasMore = orders.length > PER_PAGE;
    return NextResponse.json({
      ok: true,
      orders: orders.slice(0, PER_PAGE).map((o) => ({
        id: o.id,
        number: o.number,
        date: o.date_created,
        status: o.status,
        total: o.total,
        currency: o.currency,
        items: (o.line_items ?? []).map(pickLine),
      })),
      page,
      hasMore,
    });
  } catch (e) {
    if (e instanceof WcError)
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    return NextResponse.json({ ok: false, error: 'Could not reach the store.' }, { status: 502 });
  }
}
