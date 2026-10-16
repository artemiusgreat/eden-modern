'use client';

import { MDBContainer, MDBRow, MDBCol } from 'mdb-react-ui-kit';
import styles from './loading.module.css';

/** Instant skeleton while a category page streams in. */
export default function Loading() {
  return (
    <MDBContainer className="py-5">
      <div className={`skel mb-2 ${styles.skelBreadcrumb}`} />
      <div className={`skel mb-2 ${styles.skelTitle}`} />
      <div className={`skel mb-4 ${styles.skelDesc}`} />
      <MDBRow>
        {[0, 1, 2].map((i) => (
          <MDBCol md="4" sm="6" className="mb-4" key={i}>
            <div className={`skel ${styles.skelImage}`} />
            <div className={`skel mt-3 ${styles.skelLine}`} />
            <div className={`skel mt-2 ${styles.skelLineHalf}`} />
          </MDBCol>
        ))}
      </MDBRow>
    </MDBContainer>
  );
}
