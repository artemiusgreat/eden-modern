'use client';

import styles from './TrustpilotStars.module.css';

/** Trustpilot-style 5-star row (green squares). Pure CSS, no external widget. */
export default function TrustpilotStars({ size = 18 }: { size?: number }) {
  return (
    <span className={styles.stars} aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={styles.star} style={{ width: size, height: size, fontSize: size * 0.55 }}>
          <i className="fas fa-star" />
        </span>
      ))}
    </span>
  );
}
