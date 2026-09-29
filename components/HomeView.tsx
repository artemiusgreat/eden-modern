'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct, StoreCategory, WpPost } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import ProductCard from './ProductCard';
import TrustpilotStars from './TrustpilotStars';
import styles from './HomeView.module.css';

const PROMISES = [
  { icon: 'certificate', title: '100% Authentic', text: 'Genuine designer fragrances and beauty, sourced from trusted brands.', href: '/contacts' },
  { icon: 'truck-fast', title: 'Free Shipping', text: 'Complimentary shipping on all orders over $50, tracked door to door.', href: '/contacts' },
  { icon: 'lock', title: 'Secure Checkout', text: 'Encrypted payments and buyer protection on every single order.', href: '/privacy' },
  { icon: 'headset', title: 'Expert Support', text: 'Real people, fast answers — here to help before and after you buy.', href: '/contacts' },
];

const STEPS = [
  { icon: 'magnifying-glass', num: '01', title: 'Discover', text: 'Browse curated collections and find your perfect match.' },
  { icon: 'bag-shopping', num: '02', title: 'Choose', text: 'Add authentic pieces to your bag with confidence.' },
  { icon: 'credit-card', num: '03', title: 'Checkout', text: 'Fast, encrypted checkout in under a minute.' },
  { icon: 'truck-fast', num: '04', title: 'Delivery', text: 'Carefully packed and shipped straight to your door.' },
  { icon: 'star', num: '05', title: 'Enjoy', text: 'Unbox, indulge, and make it unmistakably yours.' },
];

const TESTIMONIALS = [
  { quote: 'The fragrances are unmistakably authentic and arrived beautifully packed. My new favorite beauty destination.', name: 'Sofia M.', detail: 'Verified buyer' },
  { quote: 'Ordered a perfume that was sold out everywhere else. Fast shipping, genuine product, wonderful experience.', name: 'Daniel K.', detail: 'Verified buyer' },
  { quote: 'Great prices on designer skincare and the customer care team answered within hours. Highly recommended.', name: 'Amara O.', detail: 'Verified buyer' },
];

function NewsletterCta() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className={styles.ctaBand}>
      <MDBContainer>
        <h2>Ready to find your signature scent?</h2>
        <p>Join the list for exclusive offers and new arrivals.</p>
        {done ? (
          <p className="mb-0" style={{ color: '#14110b', fontWeight: 600 }}>
            <MDBIcon fas icon="circle-check" className="me-2" />
            You're on the list — welcome.
          </p>
        ) : (
          <form
            className="newsletter-shell"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="Enter your email address"
              aria-label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit">Subscribe</button>
          </form>
        )}
      </MDBContainer>
    </section>
  );
}

export default function HomeView({
  onSale,
  newest,
  topCats,
  posts,
}: {
  onSale: StoreProduct[];
  newest: StoreProduct[];
  topCats: StoreCategory[];
  posts: WpPost[];
}) {
  const heroProduct = newest[0] ?? onSale[0];
  const heroImg = heroProduct?.images[0];
  const storyCat = topCats.find((c) => c.image) ?? topCats[0];
  void posts;

  return (
    <>
      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        {heroImg && (
          <div className={styles.heroBg}>
            <img src={heroImg.src} alt="" aria-hidden="true" />
          </div>
        )}
        <div className={styles.heroShade} />
        <MDBContainer className={`${styles.heroContent} py-5`}>
          <MDBRow>
            <MDBCol lg="8">
              <h1>
                Scents That
                <br />
                Inspire.
              </h1>
              <div className={styles.heroRule} />
              <p className={styles.heroSub}>
                Authentic luxury fragrances,
                <br />
                curated for you.
              </p>
              <Link href="#bestsellers" className="btn-noir">
                Shop bestsellers
              </Link>
            </MDBCol>
          </MDBRow>
        </MDBContainer>
      </section>

      {/* ============ PROMISE ============ */}
      <section className="noir-section">
        <MDBContainer>
          <p className="noir-kicker">Why shop with us</p>
          <h2 className="noir-title">Authentic. Curated. Elevated.</h2>
          <MDBRow>
            {PROMISES.map((p) => (
              <MDBCol md="3" sm="6" className="mb-4" key={p.title}>
                <Link href={p.href} className={styles.promiseCard}>
                  <h3 className="d-flex align-items-center">
                    <MDBIcon fas icon={p.icon} className="me-3" />
                    {p.title}
                  </h3>
                  <p>{p.text}</p>
                  <span className={styles.promiseLink}>
                    Learn more <MDBIcon fas icon="arrow-right" />
                  </span>
                </Link>
              </MDBCol>
            ))}
          </MDBRow>
        </MDBContainer>
      </section>

      {/* ============ BEST SELLERS ============ */}
      {newest.length > 0 && (
        <section className="pb-5" id="bestsellers" style={{ scrollMarginTop: 90 }}>
          <MDBContainer>
            <div className="noir-head-split">
              <h2>Best sellers</h2>
              <Link href="/search">
                View all <MDBIcon fas icon="arrow-right" className="ms-1" />
              </Link>
            </div>
            <MDBRow>
              {newest.slice(0, 4).map((p) => (
                <MDBCol md="3" sm="6" className="mb-4" key={p.id}>
                  <ProductCard product={p} badge="bestseller" />
                </MDBCol>
              ))}
            </MDBRow>
          </MDBContainer>
        </section>
      )}

      {/* ============ COLLECTIONS ============ */}
      {topCats.length > 0 && (
        <section className="noir-section" style={{ paddingTop: '2rem' }}>
          <MDBContainer>
            <div className="noir-head-split">
              <h2>Featured collections</h2>
              <Link href="/search">
                View all <MDBIcon fas icon="arrow-right" className="ms-1" />
              </Link>
            </div>
            <MDBRow>
              {topCats.slice(0, 4).map((c) => (
                <MDBCol md="3" sm="6" className="mb-4" key={c.id}>
                  <Link href={`/category/${c.slug}`} className={styles.collectionCard}>
                    <div className={styles.collectionMedia}>
                      {c.image ? (
                        <img src={c.image.src} alt={c.name} loading="lazy" />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                          <MDBIcon fas icon="tags" size="2x" style={{ color: 'var(--faint)' }} />
                        </div>
                      )}
                    </div>
                    <h3>{c.name}</h3>
                    <p>{c.count} products</p>
                  </Link>
                </MDBCol>
              ))}
              {onSale[0]?.images[0] && (
                <MDBCol md="3" sm="6" className="mb-4">
                  <Link href="/search?on_sale=1" className={styles.collectionCard}>
                    <div className={styles.collectionMedia}>
                      <img src={onSale[0].images[0].src} alt="On sale" loading="lazy" />
                    </div>
                    <h3>On Sale</h3>
                    <p>{onSale.length} products</p>
                  </Link>
                </MDBCol>
              )}
              {newest[0]?.images[0] && (
                <MDBCol md="3" sm="6" className="mb-4">
                  <Link href="/search" className={styles.collectionCard}>
                    <div className={styles.collectionMedia}>
                      <img src={newest[0].images[0].src} alt="New arrivals" loading="lazy" />
                    </div>
                    <h3>New Arrivals</h3>
                    <p>Just landed</p>
                  </Link>
                </MDBCol>
              )}
            </MDBRow>
          </MDBContainer>
        </section>
      )}

      {/* ============ STORY ============ */}
      {storyCat && (
        <section className="noir-section" style={{ paddingTop: 0 }}>
          <MDBContainer fluid className="px-0">
            <MDBRow className="g-0">
              <MDBCol md="6">
                <div className={styles.storyMedia}>
                  {storyCat.image && (
                    <img src={storyCat.image.src} alt={storyCat.name} loading="lazy" />
                  )}
                </div>
              </MDBCol>
              <MDBCol md="6">
                <div className={styles.storyPanel}>
                  <p className="kicker mb-3">Our story</p>
                  <h2>
                    Beauty is personal.
                    <br />
                    We make it exceptional.
                  </h2>
                  <p>
                    {stripHtml(storyCat.description || '').slice(0, 260) ||
                      'At Indemos, we believe exceptional beauty is more than aesthetics — it is about finding the scents and rituals that reflect your story.'}
                  </p>
                  <p>
                    Every piece in our collection is hand-picked, 100% authentic, and
                    chosen to elevate your everyday.
                  </p>
                  <div className="mt-3">
                    <Link href="/blog" className="btn-outline-noir">
                      Read the journal
                    </Link>
                  </div>
                </div>
              </MDBCol>
            </MDBRow>
          </MDBContainer>
        </section>
      )}

      {/* ============ PROCESS ============ */}
      <section className="noir-section" style={{ paddingTop: '2rem' }}>
        <MDBContainer>
          <p className="noir-kicker">Easy by design</p>
          <h2 className="noir-title">From discovery to your doorstep.</h2>
          <div className={styles.processTrack}>
            <MDBRow>
              {STEPS.map((s) => (
                <MDBCol key={s.num} className="mb-4" xs="6" md="auto" style={{ flex: '1 1 0' }}>
                  <div className={styles.processStep}>
                    <span className={styles.stepIcon}>
                      <MDBIcon fas icon={s.icon} />
                    </span>
                    <h3>
                      {s.num}. {s.title}
                    </h3>
                    <p>{s.text}</p>
                  </div>
                </MDBCol>
              ))}
            </MDBRow>
          </div>
        </MDBContainer>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="noir-section" style={{ paddingTop: '2rem' }}>
        <MDBContainer>
          <p className="noir-kicker">Kind words</p>
          <h2 className="noir-title">Our clients say it best.</h2>
          <MDBRow>
            {TESTIMONIALS.map((t) => (
              <MDBCol md="4" className="mb-4" key={t.name}>
                <div className={styles.quoteCard}>
                  <span className={styles.qmark}>&ldquo;</span>
                  <blockquote>{t.quote}</blockquote>
                  <p className={styles.qwho}>
                    <strong>— {t.name}</strong>
                    {t.detail}
                  </p>
                </div>
              </MDBCol>
            ))}
          </MDBRow>
          <div className="text-center mt-4">
            <a
              href="https://www.trustpilot.com/review/eden.indemos.com"
              target="_blank"
              rel="noopener noreferrer"
              className="d-inline-flex align-items-center gap-2 text-decoration-none"
            >
              <TrustpilotStars />
              <span className="small" style={{ color: 'var(--muted)' }}>See our reviews on Trustpilot</span>
            </a>
          </div>
        </MDBContainer>
      </section>

      {/* ============ CTA BAND ============ */}
      <NewsletterCta />
    </>
  );
}
