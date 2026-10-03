import { NextResponse } from 'next/server';

// Contact form submission. Forwards to the WordPress eden/v1/contact endpoint
// (wp_mail to the admin email) — no Elementor, no extra plugin.
const WP = (process.env.WC_STORE_URL ?? 'https://edenapi.indemos.com').replace(/\/$/, '');

export async function POST(req: Request) {
  try {
    const { name, email, message } = (await req.json()) as {
      name?: string;
      email?: string;
      message?: string;
    };
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Please fill in your name, email and message.' },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    const res = await fetch(`${WP}/wp-json/eden/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
    } | null;
    if (res.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({
      ok: false,
      error: data?.message ?? 'Could not send your message. Please try again.',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
