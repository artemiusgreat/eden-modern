'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBIcon } from 'mdb-react-ui-kit';
import styles from './Catalog.module.css';

interface Props {
  page: number;
  totalPages: number;
  params: Record<string, string>;
  /** URL base the ?page= param attaches to. Defaults to /catalog. */
  basePath?: string;
}

function pageUrl(basePath: string, params: Record<string, string>, page: number): string {
  const p = new URLSearchParams(params);
  if (page <= 1) p.delete('page');
  else p.set('page', String(page));
  const s = p.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** First / prev / [page input] of N / next / last. */
export default function CatalogPagination({ page, totalPages, params, basePath = '/catalog' }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(String(page));

  // The component stays mounted while the ?page= param changes.
  useEffect(() => {
    setValue(String(page));
  }, [page]);

  if (totalPages <= 1) return null;

  const go = (n: number) => {
    const target = Math.min(Math.max(1, Math.floor(n) || 1), totalPages);
    router.push(pageUrl(basePath, params, target));
  };

  const commit = () => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) go(n);
    else setValue(String(page)); // reset on non-numeric input
  };

  const arrow = (target: number, icon: string, label: string, disabled: boolean) =>
    disabled ? (
      <span className={`${styles.pageLink} ${styles.pageDisabled}`} aria-hidden="true">
        <MDBIcon fas icon={icon} />
      </span>
    ) : (
      <Link href={pageUrl(basePath, params, target)} className={styles.pageLink} aria-label={label}>
        <MDBIcon fas icon={icon} />
      </Link>
    );

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {arrow(1, 'angle-double-left', 'First page', page <= 1)}
      {arrow(page - 1, 'chevron-left', 'Previous page', page <= 1)}
      <form
        className={styles.pageForm}
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}>
        <input
          className={styles.pageInput}
          value={value}
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="Current page"
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
        />
      </form>
      <span className={styles.pageOf}>of {totalPages}</span>
      {arrow(page + 1, 'chevron-right', 'Next page', page >= totalPages)}
      {arrow(totalPages, 'angle-double-right', 'Last page', page >= totalPages)}
    </nav>
  );
}
