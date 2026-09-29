'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct } from '@/lib/woo';
import { formatPrice } from '@/lib/format';
import styles from './HomeView.module.css';

const AUTOPLAY_MS = 5000;

/**
 * Hero "Featured" mini slideshow: one large product card at a time,
 * auto-rotating with a zoom-fade transition (no sliding). Pauses on
 * hover/focus and honors prefers-reduced-motion.
 */
export default function HeroFeatured({ products }: { products: StoreProduct[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = products.length;

  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused]);

  if (count === 0) return null;
  const p = products[index];
  const img = p.images[0];
  const price = p.on_sale ? p.prices.sale_price : p.prices.price;

  return (
    <div className={styles.heroFeatured}>
      <p className={styles.heroFeatKicker}>Featured</p>
      <div
        className={styles.heroStage}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <Link
          key={p.id}
          href={`/products/${p.slug}`}
          className={`${styles.heroSlide} ${styles.slideAnim}`}
        >
          {img && <img src={img.src} alt="" aria-hidden="true" />}
          <span className={styles.heroSlideBody}>
            <span className={styles.heroSlideName}>{p.name}</span>
            <span className={styles.heroSlidePrice}>
              {formatPrice(price, p.prices.currency_minor_unit, p.prices.currency_symbol)}
            </span>
            <span className={styles.heroSlideCta}>
              Shop now <MDBIcon fas icon="arrow-right" />
            </span>
          </span>
        </Link>
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
