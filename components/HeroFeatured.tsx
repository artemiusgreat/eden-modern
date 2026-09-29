'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import { formatPrice } from '@/lib/format';
import styles from './HomeView.module.css';

const AUTOPLAY_MS = 5000;
const EXIT_MS = 750; // matches heroFadeOut duration

const wrap = (i: number, n: number) => ((i % n) + n) % n;
const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hero "Featured" mini slideshow: one large product card at a time,
 * auto-rotating with a zoom crossfade (no sliding). The outgoing slide stays
 * mounted while fading out, and both enter/exit run as mount keyframes so the
 * animation always triggers. Pauses on hover/focus, honors reduced motion.
 */
export default function HeroFeatured({ products }: { products: StoreProduct[] }) {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);
  const count = products.length;

  const go = useCallback(
    (i: number) => {
      const n = wrap(i, count);
      if (n === indexRef.current) return;
      if (!reducedMotion()) setExiting(indexRef.current);
      indexRef.current = n;
      setIndex(n);
    },
    [count]
  );

  // Autoplay.
  useEffect(() => {
    if (count < 2 || paused || reducedMotion()) return;
    const t = setInterval(() => go(indexRef.current + 1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused, go]);

  // Unmount the outgoing slide once its fade-out finishes.
  useEffect(() => {
    if (exiting === null) return;
    const t = setTimeout(() => setExiting(null), EXIT_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  if (count === 0) return null;

  return (
    <div className={styles.heroFeatured}>
      <div
        className={styles.heroStage}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => {
          // Only unpause when focus truly leaves the stage, not when it moves
          // between the dots/arrows inside it.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        {products.map((prod, i) => {
          const isActive = i === index;
          const isExiting = i === exiting;
          if (!isActive && !isExiting) return null;
          const img = prod.images[0];
          const price = prod.on_sale ? prod.prices.sale_price : prod.prices.price;
          return (
            <Link
              key={`${isActive ? 'a' : 'e'}-${prod.id}`}
              href={`/products/${prod.slug}`}
              className={`${styles.heroSlide} ${
                isActive ? styles.heroSlideEnter : styles.heroSlideExit
              }`}
              aria-hidden={!isActive}
              tabIndex={isActive ? 0 : -1}
            >
              <span className={styles.heroSlideInner}>
                {img && <img src={img.src} alt="" aria-hidden="true" />}
                <span className={styles.heroSlideBody}>
                  <span className={styles.heroSlideName}>{prod.name}</span>
                  <span className={styles.heroSlidePrice}>
                    {formatPrice(price, prod.prices.currency_minor_unit, prod.prices.currency_symbol)}
                  </span>
                  <span className={styles.heroSlideCta}>
                    Shop now <MDBIcon fas icon="arrow-right" />
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {count > 1 && (
        <div className={styles.heroControls}>
          <button
            type="button"
            className={styles.heroArrow}
            onClick={() => go(index - 1)}
            aria-label="Previous featured product"
          >
            <MDBIcon fas icon="chevron-left" />
          </button>
          <span className={styles.heroDots} role="tablist" aria-label="Featured products">
            {products.map((prod, i) => (
              <button
                key={prod.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`${styles.heroDot}${i === index ? ` ${styles.heroDotActive}` : ''}`}
                onClick={() => go(i)}
                aria-label={`Show featured product ${i + 1} of ${count}`}
              />
            ))}
          </span>
          <button
            type="button"
            className={styles.heroArrow}
            onClick={() => go(index + 1)}
            aria-label="Next featured product"
          >
            <MDBIcon fas icon="chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}
