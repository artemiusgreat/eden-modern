import { redirect } from 'next/navigation';

// Legacy route: the old /search page now lives at /catalog. Map the old
// query params (?q=, ?on_sale=, ?page=) so bookmarks keep working.
type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default async function SearchRedirect({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const p = new URLSearchParams();
  const q = (first(sp.q) ?? '').trim();
  if (q) p.set('search', q);
  if (first(sp.on_sale) === '1') p.set('on_sale', '1');
  const page = first(sp.page);
  if (page) p.set('page', page);
  const s = p.toString();
  redirect(s ? `/catalog?${s}` : '/catalog');
}
