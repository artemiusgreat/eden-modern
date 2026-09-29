'use client';

import { useEffect, useRef } from 'react';
import styles from './HomeView.module.css';

const SPEED = 0.22; // backdrop drifts at 22% of scroll speed
const MAX_SHIFT = 160; // px — stays within the heroBg overhang

/**
 * Hero backdrop with a subtle scroll parallax. The backdrop layer is taller
 * than the hero (see .heroBg), so the shift never reveals an edge.
 * Disabled entirely under prefers-reduced-motion.
 */
export default function HeroParallax({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const y = Math.min(window.scrollY * SPEED, MAX_SHIFT);
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.heroBg} ref={ref} aria-hidden="true">
      <img src={src} alt="" aria-hidden="true" />
    </div>
  );
}
