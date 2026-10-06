import { notFound } from 'next/navigation';
import { getWpPage } from '@/lib/woo';
import InfoPageView from '@/components/InfoPageView';

export const revalidate = 86400; // info pages change rarely

export async function generateMetadata() {
  const page = await getWpPage('privacy').catch(() => null);
  return { title: page?.title ?? 'Privacy' };
}

export default async function PrivacyPage() {
  const page = await getWpPage('privacy').catch(() => null);
  if (!page) notFound();
  return <InfoPageView title={page.title} content={page.content} caption="How we collect, use, and protect your information." />;
}
