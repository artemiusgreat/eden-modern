'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBBreadcrumb, MDBBreadcrumbItem } from 'mdb-react-ui-kit';

/** Renders a WordPress info page (privacy, refunds, contacts) in the luxury theme. */
export default function InfoPageView({ title, content }: { title: string; content: string }) {
  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5">
          <MDBBreadcrumb className="mb-3">
            <Link href="/" passHref legacyBehavior>
              <MDBBreadcrumbItem>Home</MDBBreadcrumbItem>
            </Link>
            <MDBBreadcrumbItem active>{title}</MDBBreadcrumbItem>
          </MDBBreadcrumb>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>{title}</h1>
          <div className="divider-gold" style={{ margin: '1rem 0' }} />
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <div className="prose-wp" dangerouslySetInnerHTML={{ __html: content }} />
      </MDBContainer>
    </>
  );
}
