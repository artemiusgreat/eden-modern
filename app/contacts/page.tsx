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
  const content = page.content.replace(
    /<form[^>]*class="[^"]*elementor-form[^"]*"[^>]*>[\s\S]*?<\/form>/i,
    ''
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
