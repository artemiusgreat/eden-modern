'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBIcon } from 'mdb-react-ui-kit';
import PageHero from './PageHero';
import type { WpPost } from '@/lib/woo';

function PostCard({ post }: { post: WpPost }) {
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
        <h2 className="font-serif mb-2" style={{ fontSize: '1.5rem' }}>{post.title}</h2>
        <div
          className="prose-wp small"
          style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: post.excerpt }}
        />
        <span className="text-gold mt-3 d-block" style={{ textTransform: 'uppercase', fontSize: '0.72rem' }}>
          Read story <MDBIcon fas icon="arrow-right" className="ms-1" />
        </span>
      </div>
    </Link>
  );
}

export default function BlogIndexView({ posts }: { posts: WpPost[] }) {
  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Magazine' },
        ]}
        title="The Magazine"
        caption="Fragrance notes, skincare science and beauty rituals - from our editors."
      />
      <MDBContainer className="py-5">
        {posts.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Stories are on their way — check back soon.</p>
        ) : (
          <MDBRow>
            {posts.map((p) => (
              <MDBCol md="4" className="mb-4" key={p.id}>
                <PostCard post={p} />
              </MDBCol>
            ))}
          </MDBRow>
        )}
      </MDBContainer>
    </>
  );
}
