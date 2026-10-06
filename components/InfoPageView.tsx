'use client';

import { MDBContainer } from 'mdb-react-ui-kit';
import PageHero from './PageHero';

/** Renders a WordPress info page (privacy, refunds, contacts) in the luxury theme. */
export default function InfoPageView({ title, content }: { title: string; content: string }) {
  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: title },
        ]}
        title={title}
      />
      <MDBContainer className="py-5">
        <div className="prose-wp" dangerouslySetInnerHTML={{ __html: content }} />
      </MDBContainer>
    </>
  );
}
