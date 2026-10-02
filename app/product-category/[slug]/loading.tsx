'use client';

import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';

/** Instant skeleton while a category page streams in. */
export default function Loading() {
  return (
    <MDBContainer className="py-5">
      <div className="skel mb-2" style={{ height: 16, width: 200 }} />
      <div className="skel mb-2" style={{ height: 52, width: '45%' }} />
      <div className="skel mb-4" style={{ height: 18, width: '60%' }} />
      <MDBRow>
        {[0, 1, 2].map((i) => (
          <MDBCol md="4" sm="6" className="mb-4" key={i}>
            <div className="skel" style={{ aspectRatio: '4 / 5' }} />
            <div className="skel mt-3" style={{ height: 18 }} />
            <div className="skel mt-2" style={{ height: 18, width: '50%' }} />
          </MDBCol>
        ))}
      </MDBRow>
    </MDBContainer>
  );
}
