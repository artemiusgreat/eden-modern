'use client';


import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody } from 'mdb-react-ui-kit';
import PageHero from './PageHero';
import styles from './AccountView.module.css';

export default function ResetPasswordView({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validLink = token.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Standard inline validation (lib/validation.ts) — no native popovers;
    // length and mismatch are field errors now, not form-level alerts.
    const fe: typeof fieldErrors = {};
    if (!password) fe.password = 'Please enter your new password.';
    else if (password.length < 8) fe.password = 'Password must be at least 8 characters.';
    if (!confirm) fe.confirm = 'Please confirm your new password.';
    else if (password && password !== confirm) fe.confirm = 'Passwords do not match.';
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;
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
      <PageHero
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Account', href: '/account' },
          { label: 'Reset Password' },
        ]}
        title="Reset Password"
        caption="Choose a new password for your account."
      />
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol lg="6">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                {!validLink ? (
                  <div className="text-start">
                    <h2 className={`${styles.formTitle} text-start`}>Invalid link</h2>
                    <p className={styles.muted}>
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
                    <p className={styles.infoText}>
                      Your password has been reset. You can now sign in with your new password.
                    </p>
                    <div className="d-flex justify-content-end mt-4">
                      <button className="btn-gold" onClick={() => router.push('/account')}>
                        Sign in
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} noValidate>
                    <h2 className={`${styles.formTitle} text-start`}>New password</h2>
                    <div className="mb-3 text-start">
                      <label className={"form-label small " + styles.muted}>
                        New password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${styles.input}`}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        aria-invalid={!!fieldErrors.password}
                      />
                      {fieldErrors.password && (
                        <p className={styles.fieldError}>{fieldErrors.password}</p>
                      )}
                    </div>
                    <div className="mb-3 text-start">
                      <label className={"form-label small " + styles.muted}>
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={`form-control ${styles.input}`}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        aria-invalid={!!fieldErrors.confirm}
                      />
                      {fieldErrors.confirm && (
                        <p className={styles.fieldError}>{fieldErrors.confirm}</p>
                      )}
                    </div>
                    {error && (
                      <p className={"small mb-3 " + styles.errorText} role="alert">
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
