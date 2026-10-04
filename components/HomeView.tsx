'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import type { StoreProduct, StoreCategory, WpPost } from '@/lib/woo';
import { stripHtml } from '@/lib/format';
import ProductCard from './ProductCard';
import HeroFeatured from './HeroFeatured';
import HeroParallax from './HeroParallax';
import styles from './HomeView.module.css';

const PROMISES = [
  { icon: 'certificate', title: '100% Authentic', text: 'Genuine designer fragrances and beauty, sourced from trusted brands.', href: '/catalog' },
  { icon: 'truck-fast', title: 'Free Shipping', text: 'Complimentary shipping on all orders over $50, tracked door to door.', href: '/refunds-and-returns' },
  { icon: 'lock', title: 'Secure Checkout', text: 'Encrypted payments and buyer protection on every single order.', href: '/privacy' },
  { icon: 'headset', title: 'Responsive Support', text: 'Real people, fast answers - here to help before and after you buy.', href: '/contacts' },
];

const STEPS = [
  { icon: 'magnifying-glass', num: '01', title: 'Discover', text: 'Browse curated collections and find your perfect match.' },
  { icon: 'bag-shopping', num: '02', title: 'Choose', text: 'Add authentic pieces to your bag with confidence.' },
  { icon: 'credit-card', num: '03', title: 'Checkout', text: 'Fast, encrypted checkout in under a minute.' },
  { icon: 'truck-fast', num: '04', title: 'Delivery', text: 'Carefully packed and shipped straight to your door.' },
  { icon: 'star', num: '05', title: 'Enjoy', text: 'Unbox, indulge, and make it unmistakably yours.' },
];

/* Featured collections: hardcoded links, but the tile photo comes from the
   WooCommerce category image (set in WP: Products > Categories > Thumbnail)
   via the `slug` — passed in as collectionImages. Tiles without a category
   (or without an image set) render the tag-icon placeholder. */
const COLLECTIONS = [
  { name: 'Fragrances', image: '/images/categories/fragrances-category.jpg', href: '/product-category/perfumes-colognes', slug: 'perfumes-colognes', sub: 'Perfumes · Colognes · Home fragrance' },
  { name: 'Skincare', image: '/images/categories/beauty-category.jpg', href: '/product-category/skin-care-cosmetics', slug: 'skin-care-cosmetics', sub: 'Face · Body · Bath' },
  { name: 'Sale', image: '/images/categories/sale-category.jpg', href: '/catalog?on_sale=1', slug: null as string | null, sub: 'Limited-time offers' },
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
          <p className="mb-0" style={{ color: 'var(--ink)', fontWeight: 600 }}>
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

function MagazineCard({ post }: { post: WpPost }) {
  const date = new Date(post.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <Link href={`/magazine/${post.slug}`} className="journal-card-dark">
      <div className="journal-media-dark">
        {post.image ? (
          <img src={post.image} alt={post.title} loading="lazy" />
        ) : (
          <div className="w-100 h-100 d-flex align-items-center justify-content-center">
            <MDBIcon fas icon="pen-nib" size="2x" style={{ color: 'var(--gold-soft)' }} />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="kicker mb-2" style={{ fontSize: '0.62rem' }}>{date}</p>
        <h2 className="mb-2" style={{ fontSize: '1.5rem' }}>{post.title}</h2>
        <div
          className="prose-wp small"
          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: post.excerpt }}
        />
        <span className="text-gold" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
          Read story <MDBIcon fas icon="arrow-right" className="ms-1" />
        </span>
      </div>
    </Link>
  );
}

export default function HomeView({
  onSale,
  newest,
  topCats,
  posts,
  collectionImages,
}: {
  onSale: StoreProduct[];
  newest: StoreProduct[];
  topCats: StoreCategory[];
  posts: WpPost[];
  collectionImages: Record<string, string>;
}) {
  const heroProduct = newest[0] ?? onSale[0];
  const heroImg = heroProduct?.images[0];
  const storyCat = topCats.find((c) => c.image) ?? topCats[0];
  // Featured slideshow for the hero's right column — newest after the
  // hero product, falling back to on-sale items.
  const featured = newest.length > 2 ? newest.slice(1, 5) : onSale.slice(0, 4);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className={styles.hero}>
        {heroImg && <HeroParallax src="/images/ambient-perfume.jpg" />}
        <div className={styles.heroShade} />
        <div className={styles.heroGlow} aria-hidden="true" />
        <MDBContainer className={`${styles.heroContent} py-5`}>
          <MDBRow>
            <MDBCol lg="7">
              <h1>
                Scents That
                <br />
                Inspire
              </h1>
              <p className={`${styles.heroSub} me-3`}>
                We offer organic skincare and signature perfumes designed to enhance your natural glow and leave a lasting impression.
              </p>
              <Link href="#bestsellers" className="btn-noir">
                Shop bestsellers
              </Link>
            </MDBCol>
            {featured.length > 0 && (
              <MDBCol lg="5">
                <HeroFeatured products={featured} />
              </MDBCol>
            )}
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
              <Link href="/catalog">
                View all <MDBIcon fas icon="arrow-right" className="ms-1" />
              </Link>
            </div>
            <MDBRow>
              {newest.slice(0, 3).map((p) => (
                <MDBCol md="4" sm="6" className="mb-4" key={p.id}>
                  <ProductCard product={p} badge="bestseller" />
                </MDBCol>
              ))}
            </MDBRow>
          </MDBContainer>
        </section>
      )}

      {/* ============ COLLECTIONS ============ */}
      <section className="noir-section" style={{ paddingTop: '2rem' }}>
        <MDBContainer>
          <div className="noir-head-split">
            <h2>Featured collections</h2>
            <Link href="/catalog">
              View all <MDBIcon fas icon="arrow-right" className="ms-1" />
            </Link>
          </div>
          <MDBRow>
            {COLLECTIONS.map((c) => {
              const image = collectionImages[c.slug ?? ''] ?? c.image ?? null;
              return (
              <MDBCol md="4" sm="6" className="mb-4" key={c.name}>
                <Link href={c.href} className={styles.collectionCard}>
                  <div
                  className={styles.collectionMedia}>
                    {image ? (
                      <img src={image} alt={c.name} loading="lazy" />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                        <MDBIcon fas icon="tags" size="2x" style={{ color: 'var(--faint)' }} />
                      </div>
                    )}
                  </div>
                  <h3 className={styles.collectionCaption}>{c.name}</h3>
                  <p>{c.sub}</p>
                </Link>
              </MDBCol>
              );
            })}
          </MDBRow>
        </MDBContainer>
      </section>

      {/* ============ STORY ============ */}
      {storyCat && (
        <section className="noir-section" style={{ paddingTop: 0 }}>
          <MDBContainer fluid className="px-0">
            <MDBRow className="g-0">
              <MDBCol md="6">
                <div className={styles.storyMedia}>
                  {/* Category image when one is set in WooCommerce; otherwise
                      the brand collage so the half never renders empty. */}
                  <img
                    src={'/images/story-image.jpg'}
                    alt={storyCat.name}
                    loading="lazy"
                  />
                  <div className={styles.storyShade} aria-hidden="true" />
                </div>
              </MDBCol>
              <MDBCol md="6">
                <div className={styles.storyPanel}>
                  <p className={`${styles.kicker} kicker mb-3`}>Our story</p>
                  <h2>
                    Beauty is personal
                    <br />
                    We make it exceptional
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
                    <Link href="/magazine" className="btn-outline-noir">
                      Read the magazine
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
          <h2 className="noir-title">From discovery to your doorstep</h2>
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

      {/* ============ MAGAZINE ============ */}
      <section className="noir-section" style={{ paddingTop: '2rem' }}>
        <MDBContainer>
          <p className="noir-kicker">From the magazine</p>
          <h2 className="noir-title">Stories & rituals</h2>
          {posts.length > 0 && (
            <MDBRow>
              {posts.map((p) => (
                <MDBCol md="4" className="mb-4" key={p.id}>
                  <MagazineCard post={p} />
                </MDBCol>
              ))}
            </MDBRow>
          )}
          <div className="text-center mt-4">
            <Link href="/magazine" className="text-gold text-decoration-none" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
              View all stories <MDBIcon fas icon="arrow-right" className="ms-1" />
            </Link>
          </div>
        </MDBContainer>
      </section>

      {/* ============ CTA BAND ============ */}
      <NewsletterCta />
    </>
  );
}
