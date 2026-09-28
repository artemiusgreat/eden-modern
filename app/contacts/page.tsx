import { notFound } from 'next/navigation';
import { getWpPage } from '@/lib/woo';
import InfoPageView from '@/components/InfoPageView';

export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getWpPage('contacts').catch(() => null);
  return { title: page?.title ?? 'Contacts' };
}

export default async function ContactsPage() {
  const page = await getWpPage('contacts').catch(() => null);
  if (!page) notFound();
  return <InfoPageView title={page.title} content={page.content} />;
}
