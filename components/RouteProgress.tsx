'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './RouteProgress.module.css';

// Slim gold progress bar pinned to the top of the viewport during client-side
// navigations. It appears only if the navigation takes longer than SHOW_AFTER
// ms, so fast clicks never flash it — unobtrusive by design. Hidden as soon
// as the new route renders.
const SHOW_AFTER = 150;

export default function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const arm = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        setActive(true);
      }, SHOW_AFTER);
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href') ?? '';
      // Same-page anchors and external URLs are not route transitions.
      if (!href.startsWith('/') || href.startsWith('/#')) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      arm();
    };
    const onSubmit = (e: Event) => {
      // Header search and other GET forms navigate via router.push.
      if ((e.target as HTMLElement)?.tagName === 'FORM') arm();
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // New route rendered — disarm and hide.
  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setActive(false);
  }, [pathname, searchParams]);

  if (!active) return null;
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.bar} />
    </div>
  );
}
