'use client';

import { MDBContainer } from 'mdb-react-ui-kit';
import TrustpilotStars from './TrustpilotStars';
import styles from './AnnouncementBar.module.css';

/** Slim black announcement bar above the navbar. Server-rendered static. */
export default function AnnouncementBar() {
  return (
    <div className={styles.bar}>
      <MDBContainer className="d-flex justify-content-between align-items-center py-2">
        <span className="d-none d-md-inline">Complimentary shipping on orders over $50</span>
        <span className="d-md-none">Free shipping over $50</span>
        <a
          href="https://www.trustpilot.com/review/eden.indemos.com"
          target="_blank"
          rel="noopener noreferrer"
          className="d-flex align-items-center gap-2"
        >
          <TrustpilotStars size={14} />
          <span className="d-none d-sm-inline">Rated Excellent</span>
        </a>
      </MDBContainer>
    </div>
  );
}
