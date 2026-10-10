import { NextResponse } from 'next/server';
import { getSessionCustomer, wcFetchWithHeaders, WcError } from '@/lib/wc-admin';

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
    // Paged, 10 per page. Total pages come from Woo's X-WP-TotalPages header.
    const PER_PAGE = 10;
    const page = Math.max(
      1,
      parseInt(new URL(req.url).searchParams.get('page') ?? '1', 10) || 1
    );
    const { data: orders, headers } = await wcFetchWithHeaders<any[]>(
      `/orders?customer=${userId}&per_page=${PER_PAGE}&page=${page}&orderby=date&order=desc`,
    );
    const totalPages = parseInt(headers.get('X-WP-TotalPages') ?? '1', 10) || 1;
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
      page,
      totalPages,
    });
  } catch (e) {
    if (e instanceof WcError)
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    return NextResponse.json({ ok: false, error: 'Could not reach the store.' }, { status: 502 });
  }
}
