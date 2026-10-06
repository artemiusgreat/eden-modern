import Link from 'next/link';
import { MDBBreadcrumb, MDBBreadcrumbItem, MDBContainer } from 'mdb-react-ui-kit';
import type { ReactNode } from 'react';

export interface HeroCrumb {
  label: string;
  href?: string;
}

/**
 * Unified page subheader used across the whole app:
 * left-aligned, breadcrumbs above the heading, optional caption below,
 * even 1rem vertical rhythm.
 */
export default function PageHero({
  crumbs,
  title,
  caption,
}: {
  crumbs: HeroCrumb[];
  title: string;
  caption?: ReactNode;
}) {
  return (
    <div className="info-hero">
      <MDBContainer className="py-5">
        <MDBBreadcrumb className="mb-3">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return c.href && !last ? (
              <MDBBreadcrumbItem key={c.label}>
                <Link href={c.href}>{c.label}</Link>
              </MDBBreadcrumbItem>
            ) : (
              <MDBBreadcrumbItem key={c.label} active>
                {c.label}
              </MDBBreadcrumbItem>
            );
          })}
        </MDBBreadcrumb>
        <h1 className="font-serif page-hero-title">{title}</h1>
        <div className="divider-gold page-hero-divider" aria-hidden="true" />
        {caption ? <p className="page-hero-caption">{caption}</p> : null}
      </MDBContainer>
    </div>
  );
}
