'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { MDBContainer, MDBRow, MDBCol, MDBBreadcrumb, MDBBreadcrumbItem } from 'mdb-react-ui-kit';

/** Renders a WordPress info page (privacy, refunds, contacts) in the luxury theme. */
export default function InfoPageView({ title, content }: { title: string; content: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // The headless frontend renders Elementor form HTML without Elementor's JS,
  // so a native submit would just reload the page. Intercept it and forward
  // to our /api/contact (which proxies to Elementor's AJAX handler).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const form = root.querySelector<HTMLFormElement>('form.elementor-form');
    if (!form || form.dataset.hijacked) return;
    form.dataset.hijacked = '1';

    const msg = document.createElement('p');
    msg.style.display = 'none';
    form.appendChild(msg);
    const say = (text: string, ok: boolean) => {
      msg.textContent = text;
      msg.style.display = 'block';
      msg.style.color = ok ? 'var(--gold-soft)' : '#e0655f';
      msg.style.marginTop = '1rem';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = String(data.get('form_fields[name]') ?? '').trim();
      const email = String(data.get('form_fields[email]') ?? '').trim();
      const message = String(data.get('form_fields[field_2d98634]') ?? '').trim();
      if (!name || !email || !message) {
        say('Please fill in your name, email and message.', false);
        return;
      }
      const btn = form.querySelector<HTMLButtonElement>('[type="submit"], button');
      if (btn) btn.disabled = true;
      say('Sending…', true);
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        const out = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (out?.ok) {
          say('Thank you — your message has been sent. We will get back to you soon.', true);
          form.reset();
        } else {
          say(out?.error ?? 'Could not send your message. Please try again.', false);
        }
      } catch {
        say('Could not send your message. Please try again.', false);
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }, [content]);

  return (
    <>
      <div className="info-hero">
        <MDBContainer className="py-5">
          <MDBBreadcrumb className="mb-3">
            <MDBBreadcrumbItem>
              <Link href="/">Home</Link>
            </MDBBreadcrumbItem>
            <MDBBreadcrumbItem active>{title}</MDBBreadcrumbItem>
          </MDBBreadcrumb>
          <h1 className="font-serif" style={{ fontSize: '3rem' }}>{title}</h1>
          <div className="divider-gold" style={{ margin: '1rem 0' }} />
        </MDBContainer>
      </div>
      <MDBContainer className="py-5">
        <div ref={rootRef} className="prose-wp" dangerouslySetInnerHTML={{ __html: content }} />
      </MDBContainer>
    </>
  );
}
