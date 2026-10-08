import { NextResponse } from 'next/server';
import { sendEmail, escapeHtml } from '@/lib/email';
import { env } from '@/lib/env';

// Newsletter signup — emails the address to the store inbox with a
// filter-friendly subject. No list provider involved.

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    const clean = email?.trim() ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
    }

    const to = env.EMAIL_FROM;
    const sent = await sendEmail({
      to,
      subject: `Newsletter signup: ${clean}`,
      html: `<p><strong>New newsletter subscriber:</strong> ${escapeHtml(clean)}</p>`,
      replyTo: clean,
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
      { ok: false, error: 'Could not subscribe. Please try again.' },
      { status: 502 }
    );
  }
}
