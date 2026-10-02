'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBIcon } from 'mdb-react-ui-kit';
import styles from './AccountView.module.css';

const WP_LOST_PASSWORD = 'https://eden.indemos.com/my-account/lost-password/';

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
      <button type="submit" className="btn-gold" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="small mt-3 mb-0 text-center">
        <a href={WP_LOST_PASSWORD} className="text-decoration-none" style={{ color: 'var(--muted)' }}>
          Lost your password?
        </a>
      </p>
    </form>
  );
}

function RegisterForm() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email }),
      });
      const data = await res.json();
      if (data.ok) {
        setDone(true);
      } else {
        setError(data.error ?? 'Registration failed. Please try again.');
      }
    } catch {
      setError('Could not reach the store. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-3">
        <MDBIcon fas icon="circle-check" size="2x" className="text-gold mb-3" />
        <h3 className="font-serif mb-3" style={{ fontSize: '1.4rem' }}>
          Account created
        </h3>
        <p style={{ color: 'var(--muted)' }}>
          Check <strong style={{ color: 'var(--ink)' }}>{email}</strong> for the link to set your
          password, then sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <Field
        label="Username"
        type="text"
        autoComplete="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Field
        label="Email address"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && (
        <p className="small mb-3" style={{ color: '#e8a0a0' }} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn-gold" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
      <p className="small mt-3 mb-0 text-center" style={{ color: 'var(--muted)' }}>
        We&apos;ll email you a link to set your password.
      </p>
    </form>
  );
}

export default function AccountView() {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');

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
              <MDBCardBody className={`${styles.cardBody} p-5`}>
                <div className={styles.tabs} role="tablist" aria-label="Sign in or register">
                  {(
                    [
                      ['signin', 'Sign in'],
                      ['register', 'Register'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                      onClick={() => setTab(key)}>
                      {label}
                    </button>
                  ))}
                </div>
                {tab === 'signin' ? <SignInForm /> : <RegisterForm />}
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
                  ['tag', 'Private offers', 'Early access to sales and new arrivals.'],
                ].map(([icon, title, text]) => (
                  <div key={title} className="d-flex gap-3 mb-4">
                    <MDBIcon fas fixed icon={icon} className={styles.perkIcon} />
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
