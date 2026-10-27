import { notFound } from 'next/navigation';
import { getWpPage } from '@/lib/woo';
import InfoPageView from '@/components/InfoPageView';
import ContactForm from '@/components/ContactForm';

export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getWpPage('contacts').catch(() => null);
  return { title: page?.title ?? 'Contacts' };
}

export default async function ContactsPage() {
  const page = await getWpPage('contacts').catch(() => null);
  if (!page) notFound();
  // The legacy Elementor form is replaced by the native ContactForm below.
  // The Follow Us icon row lives in the WP content (.social-links); append the
  // LinkedIn profile there at render so the content keeps a single row.
  const content = page.content
    .replace(
      /<form[^>]*class="[^"]*elementor-form[^"]*"[^>]*>[\s\S]*?<\/form>/i,
      ''
    )
    .replace(
      /(<a href="https:\/\/x\.com\/edenindemos"[^>]*>[\s\S]*?<\/a>)(\s*<\/div>)/,
      '$1\n  <a href="https://www.linkedin.com/company/eden-indemos" target="_blank" rel="noopener" aria-label="LinkedIn">\n    <i class="fab fa-linkedin-in" aria-hidden="true"></i>\n  </a>$2'
    );
  return (
    <>
      <InfoPageView title={page.title} content={content} caption="Questions about a product or your order? We're here to help." />
      <div className="container pb-5">
        <ContactForm />
      </div>
    </>
  );
}
