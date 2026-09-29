import styles from './SiteBackdrop.module.css';

/** Fixed ambient backdrop for the whole site: blurred perfume photograph
 *  under a navy grade, with slow-drifting fog wisps. Purely decorative. */
export default function SiteBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <div className={styles.photo} />
      <div className={styles.tint} />
      <div className={`${styles.fog} ${styles.fogGold}`} />
      <div className={`${styles.fog} ${styles.fogBlue}`} />
      <div className={`${styles.wisp} ${styles.wisp1}`} />
      <div className={`${styles.wisp} ${styles.wisp2}`} />
      <div className={`${styles.wisp} ${styles.wisp3}`} />
      <div className={`${styles.wisp} ${styles.wisp4}`} />
      <div className={styles.vignette} />
    </div>
  );
}
