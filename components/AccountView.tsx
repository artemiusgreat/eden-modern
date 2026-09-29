'use client';

import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import styles from './AccountView.module.css';

const WP_ACCOUNT_URL = 'https://eden.indemos.com/account/';

export default function AccountView() {
  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5 text-center">
          <p className="kicker mb-2">Welcome back</p>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>My Account</h1>
          <div className="divider-gold" />
          <p className="section-sub">
            Sign in to track your orders, manage your addresses and check out faster.
          </p>
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol md="6" lg="5" className="mb-4">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5 text-center`}>
                <MDBIcon far icon="user-circle" size="3x" className="text-gold mb-4" />
                <h2 className="font-serif mb-3" style={{ fontSize: '1.8rem' }}>
                  Sign in / Register
                </h2>
                <p className="mb-4" style={{ color: 'var(--muted)' }}>
                  Account sign-in is handled securely on our store backend. You&apos;ll be returned
                  here after signing in.
                </p>
                <a href={WP_ACCOUNT_URL} className="btn-gold text-decoration-none d-inline-block w-100">
                  Continue to sign in
                </a>
                <p className="small mt-3 mb-0" style={{ color: 'var(--muted)' }}>
                  New here? The same page lets you create an account in seconds.
                </p>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
          <MDBCol md="6" lg="5" className="mb-4">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>
                  With an account you can
                </h2>
                {[
                  ['box-open', 'Track orders', 'Follow every order from packing to delivery.'],
                  ['location-dot', 'Faster checkout', 'Saved addresses fill in automatically.'],
                  ['heart', 'Wishlist', 'Keep the pieces you love in one place.'],
                  ['tag', 'Private offers', 'Early access to sales and new arrivals.'],
                ].map(([icon, title, text]) => (
                  <div key={title} className="d-flex gap-3 mb-4">
                    <MDBIcon fas icon={icon} className={`${styles.perkIcon} mt-1`} size="lg" />
                    <div>
                      <h6 className="mb-1" style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>
                        {title}
                      </h6>
                      <p className="small mb-0" style={{ color: 'var(--muted)' }}>{text}</p>
                    </div>
                  </div>
                ))}
                <Link href="/contacts" className="text-decoration-none text-gold small" style={{ textTransform: 'uppercase' }}>
                  Need help? Contact us
                </Link>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </>
  );
}
