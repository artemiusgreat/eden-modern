'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import styles from './AccountView.module.css';

const WP = 'https://eden.indemos.com';

export default function AccountDashboard({ username }: { username: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.refresh();
    }
  };

  const links = [
    ['box-open', 'Orders', 'Track packing, shipping and delivery.', `${WP}/my-account/orders/`],
    ['location-dot', 'Addresses', 'Manage shipping and billing addresses.', `${WP}/my-account/edit-address/`],
    ['user-pen', 'Account details', 'Name, email and password.', `${WP}/my-account/edit-account/`],
  ] as const;

  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5 text-center">
          <p className="kicker mb-2">Welcome back</p>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>
            Hi, {username}
          </h1>
          <div className="divider-gold" />
          <p className="section-sub">You&apos;re signed in. Everything below is yours.</p>
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          {links.map(([icon, title, text, href]) => (
            <MDBCol md="4" className="mb-4" key={title}>
              <MDBCard className={styles.card}>
                <MDBCardBody className={`${styles.cardBody} p-4`}>
                  <MDBIcon fas icon={icon} className={`${styles.perkIcon} mb-3`} />
                  <h6 className="mb-1" style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    {title}
                  </h6>
                  <p className="small mb-3" style={{ color: 'var(--muted)' }}>
                    {text}
                  </p>
                  <a
                    href={href}
                    className="text-decoration-none text-gold small"
                    style={{ textTransform: 'uppercase' }}>
                    Open <MDBIcon fas icon="arrow-right" className="ms-1" />
                  </a>
                </MDBCardBody>
              </MDBCard>
            </MDBCol>
          ))}
        </MDBRow>
        <div className="text-center mt-2">
          <button type="button" className="btn-outline-noir" onClick={signOut} disabled={busy}>
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
          <p className="small mt-3 mb-0" style={{ color: 'var(--muted)' }}>
            Order history and address editing open on the secure store backend.{' '}
            <Link href="/contacts" className="text-decoration-none text-gold">
              Need help? Contact us
            </Link>
          </p>
        </div>
      </MDBContainer>
    </>
  );
}
