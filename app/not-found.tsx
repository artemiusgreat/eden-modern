import Link from 'next/link';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container text-center" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '4rem',
          color: 'var(--gold-soft)',
          marginBottom: '0.5rem',
          lineHeight: 1,
        }}>
        404
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          color: 'var(--ink)',
          fontSize: '1.8rem',
          marginBottom: '1rem',
        }}>
        This page is gone
      </h1>
      <p style={{ color: 'var(--muted)', maxWidth: '32rem', margin: '0 auto 2rem' }}>
        The page you are looking for does not exist or was moved. Try the catalog or head back
        home.
      </p>
      <div className="d-flex gap-3 justify-content-center">
        <Link href="/" className="btn-gold">
          Back home
        </Link>
        <Link href="/catalog" className="btn btn-outline-light">
          Browse catalog
        </Link>
      </div>
    </div>
  );
}
