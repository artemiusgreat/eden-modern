import { NextResponse } from 'next/server';

// Self-contained contact form delivery — no WordPress involved.
// Sends the message to the store's own email via the configured transport
// (Resend API if RESEND_API_KEY is set, otherwise SMTP via nodemailer).

async function sendContactEmail(
  name: string,
  fromEmail: string,
  message: string
): Promise<boolean> {
  const to = process.env.EMAIL_FROM ?? 'noreply@eden.indemos.com';
  const subject = `Contact form: ${name}`;
  const html =
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
    `<p><strong>Email:</strong> ${escapeHtml(fromEmail)}</p>` +
    `<p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;

  // Resend API (preferred if configured)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: to, to, subject, html, reply_to: fromEmail }),
    });
    return res.ok;
  }

  // SMTP via nodemailer (if configured)
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({ from: to, to, subject, html, replyTo: fromEmail });
    return true;
  }

  return false;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

    const sent = await sendContactEmail(name.trim(), email.trim(), message.trim());
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
