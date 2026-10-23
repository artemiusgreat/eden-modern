/**
 * Shared client-side form validation — the site standard, set by the
 * contact form: forms carry `noValidate`, validate in JS on submit,
 * and show the message under the field with the input flagged
 * `aria-invalid` (which paints its border #e0655f). No native browser
 * validation popovers anywhere. Every form uses these exact messages
 * for the same checks so the wording never drifts between pages.
 */
export const EMAIL_REQUIRED = 'Please enter your email address.';
export const EMAIL_INVALID = 'Enter a valid email address.';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The standard email check: required, then format. */
export function emailError(value: string): string | undefined {
  const v = value.trim();
  if (!v) return EMAIL_REQUIRED;
  if (!EMAIL_RE.test(v)) return EMAIL_INVALID;
  return undefined;
}
