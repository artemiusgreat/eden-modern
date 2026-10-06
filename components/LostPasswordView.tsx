'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody } from 'mdb-react-ui-kit';
import PageHero from './PageHero';
import styles from './AccountView.module.css';

export default function LostPasswordView() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/lost-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
      } else {
        setError(data.error ?? 'Could not send the reset email. Please try again.');
      }
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account' },
          { label: 'Lost Password' },
        ]}
        title="Lost Password"
        caption="Enter your email address and we'll send you a link to reset your password."
      />
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol lg="6">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                {sent ? (
                  <div className="text-start">
                    <h2 className={`${styles.formTitle} text-start`}>Check your email</h2>
                    <p style={{ color: 'var(--muted)' }}>
                      If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>,
                      you&apos;ll receive a password reset link shortly.
                    </p>
                    <p className="small mb-0">
                      <Link href="/account" className="text-decoration-none text-gold">
                        Back to sign in
                      </Link>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <h2 className={`${styles.formTitle} text-start`}>Reset password</h2>
                    <div className="mb-3 text-start">
                      <label className="form-label small" style={{ color: 'var(--muted)' }}>
                        Email address
                      </label>
                      <input
                        type="email"
                        autoComplete="email"
                        className={`form-control ${styles.input}`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    {error && (
                      <p className="small mb-3" style={{ color: '#e8a0a0' }} role="alert">
                        {error}
                      </p>
                    )}
                    <div className="d-flex justify-content-between align-items-center mt-4">
                      <Link href="/account" className="text-decoration-none small" style={{ color: 'var(--muted)' }}>
                        Back to sign in
                      </Link>
                      <button type="submit" className="btn-gold" disabled={busy}>
                        {busy ? 'Sending…' : 'Send reset link'}
                      </button>
                    </div>
                  </form>
                )}
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </>
  );
}
