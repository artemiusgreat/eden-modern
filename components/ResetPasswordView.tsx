'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody } from 'mdb-react-ui-kit';
import styles from './AccountView.module.css';

export default function ResetPasswordView({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validLink = token.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error ?? 'Could not reset your password. Please try again.');
      }
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5 text-start">
          <p className="kicker mb-2">Account</p>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>Reset Password</h1>
          <div className="divider-gold" style={{ marginLeft: 0 }} />
          <p className="section-sub">Choose a new password for your account.</p>
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol lg="6">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                {!validLink ? (
                  <div className="text-start">
                    <h2 className={`${styles.formTitle} text-start`}>Invalid link</h2>
                    <p style={{ color: 'var(--muted)' }}>
                      This password reset link is invalid or incomplete.
                    </p>
                    <p className="small mb-0">
                      <Link href="/account/lost-password" className="text-decoration-none text-gold">
                        Request a new reset link
                      </Link>
                    </p>
                  </div>
                ) : done ? (
                  <div className="text-start">
                    <h2 className={`${styles.formTitle} text-start`}>Password updated</h2>
                    <p style={{ color: 'var(--muted)' }}>
                      Your password has been reset. You can now sign in with your new password.
                    </p>
                    <div className="d-flex justify-content-end mt-4">
                      <button className="btn-gold" onClick={() => router.push('/account')}>
                        Sign in
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit}>
                    <h2 className={`${styles.formTitle} text-start`}>New password</h2>
                    <div className="mb-3 text-start">
                      <label className="form-label small" style={{ color: 'var(--muted)' }}>
                        New password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${styles.input}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="mb-3 text-start">
                      <label className="form-label small" style={{ color: 'var(--muted)' }}>
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${styles.input}`}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                      />
                    </div>
                    {error && (
                      <p className="small mb-3" style={{ color: '#e8a0a0' }} role="alert">
                        {error}
                      </p>
                    )}
                    <div className="d-flex justify-content-end mt-4">
                      <button type="submit" className="btn-gold" disabled={busy}>
                        {busy ? 'Saving…' : 'Set new password'}
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
