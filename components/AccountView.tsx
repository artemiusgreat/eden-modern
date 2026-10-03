'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import styles from './AccountView.module.css';

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div className="mb-3 text-start">
      <label className="form-label small" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      <input {...props} className={`form-control ${styles.input}`} required />
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      } else {
        setError(data.error ?? 'Sign-in failed. Please try again.');
      }
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Field
        label="Username or email"
        type="text"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className="small mb-3" style={{ color: '#e8a0a0' }} role="alert">
          {error}
        </p>
      )}
      <div className="d-flex justify-content-between align-items-center mt-4">
        <Link href="/account/lost-password" className="text-decoration-none small" style={{ color: 'var(--muted)' }}>
          Lost your password?
        </Link>
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}

export default function AccountView() {
  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5 text-start">
          <p className="kicker mb-2">Welcome back</p>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>My Account</h1>
          <div className="divider-gold" style={{ marginLeft: 0 }} />
          <p className="section-sub">
            Sign in to track your orders, manage your addresses and check out faster.
          </p>
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <MDBRow className="justify-content-center">
          <MDBCol lg="10">
            <MDBCard className={styles.card}>
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                <MDBRow className="gap-5">
                  <MDBCol md="6" className="mb-4 mb-md-0">
                    <h2 className={`text-start`}>Sign in</h2>
                    <SignInForm />
                  </MDBCol>
                  <MDBCol md="5" className="mt-3">
                    {[
                      ['box-open', 'Track orders', 'Follow every order from packing to delivery.'],
                      ['location-dot', 'Faster checkout', 'Saved addresses fill in automatically.'],
                      ['tag', 'Private offers', 'Early access to sales and new arrivals.'],
                    ].map(([icon, title, text]) => (
                      <div key={title} className="d-flex gap-3 mb-4">
                        <MDBIcon fas fixed icon={icon} className={styles.perkIcon} />
                        <div className="text-start">
                          <h6 className="mb-1" style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>
                            {title}
                          </h6>
                          <p className="small mb-0" style={{ color: 'var(--muted)' }}>{text}</p>
                        </div>
                      </div>
                    ))}
                    <p className="small mb-0 text-start">
                      <span>Need help?</span>&nbsp;
                      <Link href="/contacts" className="text-decoration-none text-gold">
                        Contact us
                      </Link>
                    </p>
                  </MDBCol>
                </MDBRow>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </>
  );
}
