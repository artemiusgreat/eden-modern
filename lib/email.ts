// Shared email transport — SMTP only, configured via env (see lib/env).
// Throws if sending fails; the SMTP settings are required env vars, so a
// misconfigured deploy fails fast at import time instead of silently
// dropping mail.

import { env } from './env';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Minimal HTML→text for the plain-text MIME part (spam filters prefer
    multipart mail over HTML-only). */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: env.SMTP_SENDER,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: htmlToText(opts.html),
    replyTo: opts.replyTo,
  });
  return true;
}
