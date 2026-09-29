import styles from './SiteBackdrop.module.css';

/** Fixed ambient backdrop for the whole site: faint perfume photograph
 *  under a dark grade, with one static barely-there haze veil.
 *  Purely decorative. */
export default function SiteBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.photo} />
      <div className={styles.tint} />
      <div className={styles.haze} />
      <div className={styles.vignette} />
    </div>
  );
}
