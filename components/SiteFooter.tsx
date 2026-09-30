'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreCategory } from '@/lib/woo';
import TrustpilotStars from './TrustpilotStars';
import styles from './SiteFooter.module.css';

const SOCIALS: { label: string; href: string; icon: string }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/people/Eden-Indemos/61588893673349', icon: 'facebook-f' },
  { label: 'Instagram', href: 'https://www.instagram.com/eden.indemos', icon: 'instagram' },
  { label: 'Threads', href: 'https://www.threads.com/@eden.indemos', icon: 'threads' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/edenindemos', icon: 'pinterest-p' },
  { label: 'YouTube', href: 'https://www.youtube.com/@eden-indemos', icon: 'youtube' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@eden.indemos', icon: 'tiktok' },
  { label: 'X', href: 'https://x.com/edenindemos', icon: 'x-twitter' },
];

export default function SiteFooter({ categories }: { categories: StoreCategory[] }) {
  const shopCats = categories.filter((c) => c.parent === 0).slice(0, 5);

  return (
    <footer className={styles.footer}>
      <MDBContainer className="py-5">
        <MDBRow>
          <MDBCol md="5" className="mb-4">
            <div className={`${styles.brand} mb-3`}>
              Indemos<small>Beauty & Fragrance</small>
            </div>
            <p className="me-5" style={{ fontSize: '0.85rem' }}>
              Indemos LLC offers a select collection of skincare, cosmetics, and fragrances from trusted brands around the world.
            </p>
            <a
              href="https://www.trustpilot.com/review/eden.indemos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="d-inline-flex align-items-center gap-2 mt-2">
              <TrustpilotStars size={16} />
              <span style={{ fontSize: '0.78rem', color: 'var(--ink)' }}>Trust Pilot Reviews</span>
            </a>
            <div className="d-flex gap-2 mt-4 flex-wrap">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={styles.socialBtn}
                >
                  <MDBIcon fab icon={s.icon} />
                </a>
              ))}
            </div>
          </MDBCol>

          <MDBCol md="2" sm="6" className="mb-4">
            <h6>Quick links</h6>
            <Link href="/" className={styles.flink}>Home</Link>
            <Link href="/search" className={styles.flink}>Shop</Link>
            <Link href="/blog" className={styles.flink}>Magazine</Link>
            <Link href="/account" className={styles.flink}>Account</Link>
            <Link href="/contacts" className={styles.flink}>Contact</Link>
          </MDBCol>

          <MDBCol md="2" sm="6" className="mb-4">
            <h6>Shop</h6>
            {shopCats.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className={styles.flink}>
                {c.name}
              </Link>
            ))}
            <Link href="/search?on_sale=1" className={styles.flink}>On sale</Link>
          </MDBCol>

          <MDBCol md="3" className="mb-4">
            <h6>Contact</h6>
            <div className={styles.contactLine}>
              <MDBIcon far icon="envelope" />
              <a href="mailto:support@indemos.com">support@indemos.com</a>
            </div>
            <div className={styles.contactLine}>
              <MDBIcon fas icon="location-dot" />
              <span>Store 1250, 701 State Route 440 Ste 16, Jersey City, NJ 07304</span>
            </div>
            <Link href="/search?on_sale=1" className="btn-outline-noir mt-3">
              Shop the sale
            </Link>
          </MDBCol>
        </MDBRow>
      </MDBContainer>

      <div style={{ borderTop: '1px solid var(--line)' }}>
        <MDBContainer className="py-3 d-flex flex-column flex-md-row justify-content-between gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--faint)', textTransform: 'uppercase' }}>
            © 2026 Indemos LLC. All rights reserved.
          </span>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
            <Link href="/privacy" className="me-3" style={{ color: 'var(--faint)' }}>Privacy Policy</Link>
            <Link href="/refunds-and-returns" style={{ color: 'var(--faint)' }}>Refunds & Returns</Link>
          </span>
        </MDBContainer>
      </div>
    </footer>
  );
}
