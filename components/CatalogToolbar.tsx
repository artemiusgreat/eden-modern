'use client';

import { useRouter } from 'next/navigation';
import { progressBegin } from '@/lib/progress';
import type { SortOption } from '@/app/catalog/page';
import styles from './Catalog.module.css';

interface Props {
  params: Record<string, string>;
  total: number;
  from: number;
  to: number;
  perPage: number;
  perPageOptions: number[];
  sortKey: string;
  sortOptions: SortOption[];
  search: string | null;
}

export default function CatalogToolbar({
  params,
  total,
  from,
  to,
  perPage,
  perPageOptions,
  sortKey,
  sortOptions,
  search,
}: Props) {
  const router = useRouter();

  const push = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === '') p.delete(k);
      else p.set(k, v);
    }
    p.delete('page');
    const s = p.toString();
    progressBegin(); // selects navigate via router.push — no anchor click for RouteProgress to see
    router.push(s ? `/catalog?${s}` : '/catalog', { scroll: false });
  };

  const onSortChange = (key: string) => {
    const opt = sortOptions.find((o) => o.key === key);
    if (!opt) return;
    // orderby + order are separate query params; order is dropped when the
    // chosen sort has no direction (push deletes undefined values).
    push({ orderby: opt.orderby, order: opt.order });
  };

  return (
    <div className={styles.toolbar}>
      <p className={styles.showing}>
        Showing {from}–{to} of {total} {total === 1 ? 'product' : 'products'}
        {search && (
          <>
            {' '}for <span className={styles.searchTerm}>“{search}”</span>
          </>
        )}
      </p>
      <div className={styles.toolbarControls}>
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Show</span>
          <select
            aria-label="Products per page"
            value={String(perPage)}
            onChange={(e) => push({ per_page: e.target.value })}>
            {perPageOptions.map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Sort</span>
          <select aria-label="Sort order" value={sortKey} onChange={(e) => onSortChange(e.target.value)}>
            {sortOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
