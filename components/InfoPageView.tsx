'use client';

import { MDBContainer } from 'mdb-react-ui-kit';
import PageHero from './PageHero';

/** Renders a WordPress info page (privacy, refunds, contacts) in the luxury theme. */
export default function InfoPageView({
  title,
  content,
  caption,
}: {
  title: string;
  content: string;
  caption?: string;
}) {
  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: title },
        ]}
        title={title}
        caption={caption}
      />
      <MDBContainer className="py-5">
        <div className="prose-wp" dangerouslySetInnerHTML={{ __html: content }} />
      </MDBContainer>
    </>
  );
}
