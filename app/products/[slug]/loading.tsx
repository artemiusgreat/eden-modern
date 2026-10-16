'use client';

import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';
import styles from './loading.module.css';

/** Instant skeleton while the product page streams in. */
export default function Loading() {
  return (
    <MDBContainer className="py-5">
      <div className={`skel mb-4 ${styles.skelBreadcrumb}`} />
      <MDBRow>
        <MDBCol lg="6" className="mb-4">
          <div className={`skel ${styles.skelImage}`} />
          <div className="d-flex gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`skel ${styles.skelThumb}`} />
            ))}
          </div>
        </MDBCol>
        <MDBCol lg="6">
          <div className={`skel mb-3 ${styles.skelCategory}`} />
          <div className={`skel mb-3 ${styles.skelName}`} />
          <div className={`skel mb-3 ${styles.skelPrice}`} />
          <div className={`skel mb-4 ${styles.skelCta}`} />
          <div className={`skel mb-3 ${styles.skelLine}`} />
          <div className={`skel mb-4 ${styles.skelLineWide}`} />
          <div className={`skel ${styles.skelButton}`} />
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
}
