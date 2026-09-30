'use client';

import { useRouter } from 'next/navigation';
import styles from './Catalog.module.css';

interface Props {
  params: Record<string, string>;
  total: number;
  from: number;
  to: number;
  perPage: number;
  perPageOptions: number[];
  orderby: string;
  orderbyLabels: Record<string, string>;
  search: string | null;
}

export default function CatalogToolbar({
  params,
  total,
  from,
  to,
  perPage,
  perPageOptions,
  orderby,
  orderbyLabels,
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
    router.push(s ? `/catalog?${s}` : '/catalog', { scroll: false });
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
          <select
            aria-label="Sort order"
            value={orderby}
            onChange={(e) => push({ orderby: e.target.value })}>
            {Object.entries(orderbyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
