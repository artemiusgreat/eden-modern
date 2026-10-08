'use client';

import { useState } from 'react';
import styles from './ContactForm.module.css';

/** Native contact form (Elementor-free). Validates client-side, posts to /api/contact. */
export default function ContactForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ email?: string; message?: string }>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [serverError, setServerError] = useState('');

  function validate(): boolean {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!message.trim()) e.message = 'Please enter your message.';
    else if (message.trim().length < 10) e.message = 'Your message is a bit short.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('sending');
    setServerError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      });
      const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (out?.ok) {
        setStatus('sent');
        setEmail('');
        setMessage('');
      } else {
        setStatus('failed');
        setServerError(out?.error ?? 'Could not send your message. Please try again.');
      }
    } catch {
      setStatus('failed');
      setServerError('Could not send your message. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <div className={styles.sent}>
        <p className={styles.sentTitle}>Thank you</p>
        <p>Your message has been sent. We will get back to you as soon as possible.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor="cf-email">Email address *</label>
        <input
          id="cf-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p className={styles.error}>{errors.email}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="cf-message">Message *</label>
        <textarea
          id="cf-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p className={styles.error}>{errors.message}</p>}
      </div>
      {status === 'failed' && serverError && (
        <p className={styles.error} role="alert">{serverError}</p>
      )}
      <button type="submit" className={styles.submit} disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
