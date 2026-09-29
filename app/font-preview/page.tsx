import { getProducts } from '@/lib/woo';
import ProductCard from '@/components/ProductCard';
import styles from './preview.module.css';

export const metadata = { title: 'Font preview (internal)' };

const OPTIONS = [
  {
    key: 'optA',
    label: 'Option A',
    title: 'Bodoni Moda',
    price: 'Bodoni Moda',
    note: 'Your pick for both roles — high-contrast Didone with the thinnest hairlines. Fashion-house feel.',
  },
  {
    key: 'optB',
    label: 'Option B',
    title: 'Cormorant Garamond',
    price: 'Marcellus',
    note: 'Thinnest, most delicate title; the calmest price — inscriptional Roman, almost no curves at all.',
  },
  {
    key: 'optC',
    label: 'Option C',
    title: 'Bodoni Moda',
    price: 'Marcellus',
    note: 'Dramatic thin title paired with a quiet, straight price. My lean, but judge with your eyes.',
  },
  {
    key: 'optD',
    label: 'Option D (current)',
    title: 'Playfair Display',
    price: 'Playfair Display',
    note: 'Baseline — what the site uses today, for comparison.',
  },
] as const;

export default async function FontPreviewPage() {
  const products = await getProducts({ per_page: 4 }).catch(() => []);
  const sample = products.slice(0, 2);

  return (
    <div className={`container py-5 ${styles.page}`}>
      <p className={styles.kicker}>Internal — font review, not linked in the nav</p>
      <h1 className={styles.h1}>Title &amp; price font options</h1>
      <p className={styles.lede}>
        Real product cards below, rendered in each pairing. Pick a winner and I will
        apply it site-wide, delete this page, and drop the unused fonts.
      </p>

      {OPTIONS.map((o) => (
        <section key={o.key} className={`${styles.option} ${styles[o.key]}`}>
          <h2 className={styles.optTitle}>{o.label}</h2>
          <p className={styles.optMeta}>
            Title: <b>{o.title}</b> &nbsp;·&nbsp; Price: <b>{o.price}</b>
          </p>
          <p className={styles.optNote}>{o.note}</p>
          <div className={styles.specimen}>
            <span className={styles.titleSpecimen}>AaBbGgQqRr — Eau de Parfum</span>
            <span className={styles.priceSpecimen}>
              <s>$100.00</s> $36.83
            </span>
          </div>
          {sample.length > 0 ? (
            <div className="row">
              {sample.map((p) => (
                <div className="col-md-3 col-sm-6 mb-4" key={p.id}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.optNote}>Could not load products for the live card preview.</p>
          )}
        </section>
      ))}
    </div>
  );
}
