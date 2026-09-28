'use client';

import { MDBIcon } from 'mdb-react-ui-kit';
import styles from './RatingStars.module.css';

/** Gold star rating from Woo average_rating (0–5). */
export default function RatingStars({ rating }: { rating: number }) {
  if (!(rating > 0)) return null;
  return (
    <span className={styles.stars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <MDBIcon key={i} fas={i < Math.round(rating)} far={i >= Math.round(rating)} icon="star" />
      ))}
    </span>
  );
}
