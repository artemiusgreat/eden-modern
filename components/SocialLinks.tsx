'use client';

import { MDBIcon } from 'mdb-react-ui-kit';
import { SOCIALS } from './SiteFooter';
import styles from './SocialLinks.module.css';

/** Social icon row for pages outside the footer (e.g. Contacts). */
export default function SocialLinks() {
  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>Follow us</h2>
      <div className="d-flex gap-2 flex-wrap">
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
    </div>
  );
}
