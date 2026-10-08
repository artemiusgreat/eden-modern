import { NextResponse } from 'next/server';
import { sendEmail, escapeHtml } from '@/lib/email';
import { env } from '@/lib/env';

// Self-contained contact form delivery — no WordPress involved.

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

    const to = env.SMTP_SENDER;
    const sent = await sendEmail({
      to,
      subject: `Contact form: ${name.trim()}`,
      html:
        `<p><strong>Name:</strong> ${escapeHtml(name.trim())}</p>` +
        `<p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>` +
        `<p><strong>Message:</strong></p><p>${escapeHtml(message.trim()).replace(/\n/g, '<br>')}</p>`,
      replyTo: email.trim(),
    });
    if (!sent) {
      return NextResponse.json(
        { ok: false, error: 'Email service is not configured. Please try again later.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Could not send your message. Please try again.' },
      { status: 502 }
    );
  }
}
