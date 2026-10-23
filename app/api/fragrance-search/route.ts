import { NextRequest, NextResponse } from 'next/server';
import { searchFragrances } from '@/lib/fragrance';
import { getProductsByIds } from '@/lib/woo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST { query } -> { mode, intent, results: [{ product, reason }] }
 * `mode` says which tier answered: 'llm' (OpenRouter intent parse),
 * 'embedding' (local vector search), or 'keyword' (note overlap).
 * Products are hydrated live from the Store API so price/stock/images
 * are always current; the search index only ranks IDs.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === 'string' ? body.query : '';
  if (query.trim().length < 3) {
    return NextResponse.json(
      { error: 'Tell us a little more about the scent you are looking for.' },
      { status: 400 },
    );
  }
  try {
    const { mode, intent, hits } = await searchFragrances(query);
    const products = await getProductsByIds(hits.map((h) => h.id));
    const byId = new Map(products.map((p) => [p.id, p]));
    const results = hits
      .map((h) => ({ product: byId.get(h.id), reason: h.reason }))
      .filter((r) => r.product);
    return NextResponse.json({ mode, intent, results });
  } catch (err) {
    console.error('fragrance-search failed:', err);
    return NextResponse.json(
      { error: 'Search is unavailable right now — please browse the catalog instead.' },
      { status: 500 },
    );
  }
}
