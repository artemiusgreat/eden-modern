'use client';

import type { CSSProperties } from 'react';

import styles from './TrustpilotStars.module.css';

/** Trustpilot-style 5-star row (green squares). Pure CSS, no external widget. */
export default function TrustpilotStars({ size = 18 }: { size?: number }) {
  return (
    <span className={styles.stars} aria-label="5 out of 5 stars" style={{ '--star-size': `${size}px` } as CSSProperties}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={styles.star}>
          <i className="fas fa-star" />
        </span>
      ))}
    </span>
  );
}
