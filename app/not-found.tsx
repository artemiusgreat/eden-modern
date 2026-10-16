import Link from 'next/link';
import styles from './not-found.module.css';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className={`container text-center ${styles.wrapper}`}>
      <p className={styles.code}>
        404
      </p>
      <h1 className={styles.title}>
        This page is gone
      </h1>
      <p className={styles.message}>
        The page you are looking for does not exist or was moved. Try the catalog or head back
        home.
      </p>
      <div className="d-flex gap-3 justify-content-center">
        <Link href="/" className="btn-gold">
          Back home
        </Link>
        <Link href="/catalog" className="btn-outline-site">
          Browse catalog
        </Link>
      </div>
    </div>
  );
}
