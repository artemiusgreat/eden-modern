import { NextResponse } from 'next/server';

// Forwards the Elementor contact form to WordPress's AJAX handler.
// The headless frontend renders the form HTML but not Elementor's JS, so a
// native submit would just reload the page. This route proxies to
// admin-ajax.php?action=elementor_pro_forms_send_form, preserving the
// store's existing Elementor email configuration.
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

    const body = new URLSearchParams({
      action: 'elementor_pro_forms_send_form',
      post_id: '120',
      form_id: '053f3b0',
      'form_fields[name]': name.trim(),
      'form_fields[email]': email.trim(),
      'form_fields[field_2d98634]': message.trim(),
    });
    const res = await fetch(`${WP}/wp-admin/admin-ajax.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { message?: string };
    } | null;
    if (data?.success) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({
      ok: false,
      error: data?.data?.message ?? 'Could not send your message. Please try again.',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not reach the store backend. Please try again.' },
      { status: 502 }
    );
  }
}
