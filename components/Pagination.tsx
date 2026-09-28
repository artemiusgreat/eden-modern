'use client';

import Link from 'next/link';
import { MDBPagination, MDBPaginationItem, MDBPaginationLink } from 'mdb-react-ui-kit';
import styles from './Pagination.module.css';

export default function Pagination({
  page,
  basePath,
  query = {},
}: {
  page: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.set(k, v);
    }
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <MDBPagination className={`justify-content-center mt-4 ${styles.pager}`}>
      <MDBPaginationItem disabled={page <= 1}>
        <Link href={href(page - 1)} passHref legacyBehavior>
          <MDBPaginationLink>Previous</MDBPaginationLink>
        </Link>
      </MDBPaginationItem>
      <MDBPaginationItem active>
        <MDBPaginationLink>{page}</MDBPaginationLink>
      </MDBPaginationItem>
      <MDBPaginationItem>
        <Link href={href(page + 1)} passHref legacyBehavior>
          <MDBPaginationLink>Next</MDBPaginationLink>
        </Link>
      </MDBPaginationItem>
    </MDBPagination>
  );
}
