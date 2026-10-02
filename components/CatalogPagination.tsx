'use client';

import Link from 'next/link';
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

/** Page numbers with ellipsis: 1 … p-1 p p+1 … N */
function pageWindow(page: number, totalPages: number): (number | '…')[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}

export default function CatalogPagination({ page, totalPages, params, basePath = '/catalog' }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      {page > 1 ? (
        <Link href={pageUrl(basePath, params, page - 1)} className={styles.pageLink} aria-label="Previous page">
          <MDBIcon fas icon="chevron-left" />
        </Link>
      ) : (
        <span className={`${styles.pageLink} ${styles.pageDisabled}`} aria-hidden="true">
          <MDBIcon fas icon="chevron-left" />
        </span>
      )}
      {pageWindow(page, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className={styles.pageEllipsis} aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={pageUrl(basePath, params, n)}
            aria-current={n === page ? 'page' : undefined}
            className={`${styles.pageLink} ${n === page ? styles.pageCurrent : ''}`}>
            {n}
          </Link>
        )
      )}
      {page < totalPages ? (
        <Link href={pageUrl(basePath, params, page + 1)} className={styles.pageLink} aria-label="Next page">
          <MDBIcon fas icon="chevron-right" />
        </Link>
      ) : (
        <span className={`${styles.pageLink} ${styles.pageDisabled}`} aria-hidden="true">
          <MDBIcon fas icon="chevron-right" />
        </span>
      )}
    </nav>
  );
}
