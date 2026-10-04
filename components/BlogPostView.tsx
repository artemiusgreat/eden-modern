'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBBreadcrumb, MDBBreadcrumbItem, MDBIcon } from 'mdb-react-ui-kit';
import type { WpPost } from '@/lib/woo';
import styles from './BlogPostView.module.css';

export default function BlogPostView({ post, related }: { post: WpPost; related: WpPost[] }) {
  const date = new Date(post.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <MDBContainer className="py-5">
      <MDBBreadcrumb className="mb-4">
        <MDBBreadcrumbItem>
          <Link href="/">Home</Link>
        </MDBBreadcrumbItem>
        <MDBBreadcrumbItem>
          <Link href="/magazine">Magazine</Link>
        </MDBBreadcrumbItem>
        <MDBBreadcrumbItem active>{post.title}</MDBBreadcrumbItem>
      </MDBBreadcrumb>

      <p className="kicker mb-2">{date}</p>
      <h1 className="font-serif mb-4" style={{ fontSize: '2.8rem', lineHeight: 1.15 }}>{post.title}</h1>

      {post.image && (
        <div className={`${styles.heroImg} mb-5`}>
          <img src={post.image} alt={post.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}

      <div className="prose-wp" dangerouslySetInnerHTML={{ __html: post.content }} />

      <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <Link href="/magazine" className="text-decoration-none text-gold" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
          <MDBIcon fas icon="arrow-left" className="me-2" />
          All stories
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-5">
          <div className="text-center mb-4">
            <p className="kicker mb-2">Keep reading</p>
            <h2 className="font-serif" style={{ fontSize: '2rem' }}>More Stories</h2>
            <div className="divider-gold" />
          </div>
          <MDBRow>
            {related.map((p) => (
              <MDBCol md="4" className="mb-4" key={p.id}>
                <Link href={`/magazine/${p.slug}`} className="journal-card-dark">
                  <div className="journal-media-dark">
                    {p.image && <img src={p.image} alt={p.title} loading="lazy" />}
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif" style={{ fontSize: '1.3rem' }}>{p.title}</h3>
                    <span className="text-gold" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      Read story <MDBIcon fas icon="arrow-right" className="ms-1" />
                    </span>
                  </div>
                </Link>
              </MDBCol>
            ))}
          </MDBRow>
        </section>
      )}
    </MDBContainer>
  );
}
