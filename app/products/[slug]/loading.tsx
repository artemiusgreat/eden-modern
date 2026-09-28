'use client';

import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';

/** Instant skeleton while the product page streams in. */
export default function Loading() {
  return (
    <MDBContainer className="py-5">
      <div className="skel mb-4" style={{ height: 18, width: 320 }} />
      <MDBRow>
        <MDBCol lg="6" className="mb-4">
          <div className="skel" style={{ aspectRatio: '1 / 1' }} />
          <div className="d-flex gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skel" style={{ width: 76, height: 76 }} />
            ))}
          </div>
        </MDBCol>
        <MDBCol lg="6">
          <div className="skel mb-3" style={{ height: 16, width: 140 }} />
          <div className="skel mb-3" style={{ height: 44, width: '85%' }} />
          <div className="skel mb-3" style={{ height: 20, width: 200 }} />
          <div className="skel mb-4" style={{ height: 54, width: 220 }} />
          <div className="skel mb-3" style={{ height: 16 }} />
          <div className="skel mb-4" style={{ height: 16, width: '70%' }} />
          <div className="skel" style={{ height: 54 }} />
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
}
